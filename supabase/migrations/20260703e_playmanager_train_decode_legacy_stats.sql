-- Fix: training silently failed (raised player_maxed) for ~99% of players.
--
-- Root cause: the EAFC seed import stored card_stats/base_card_stats as a
-- DOUBLE-ENCODED jsonb string ('"{\"PAC\":87,...}"') rather than a jsonb object.
-- pm_train_player's guard saw a non-object and RESEEDED via
-- pm_player_seed_card_stats(pos, ovr_base) — but that seed implies an OVR at the
-- talent growth cap, so v_pending_ovr >= v_cap_ovr fired 'player_maxed' before
-- any training happened.
--
-- Fix: decode the double-encoded string to its real object inline, so training
-- reads the player's true attributes. This does NOT rewrite the stored
-- card_stats (which would fire pm_players_sync_card_stats and recompute
-- ovr_current downward for non-EA-locked players) — it only shapes the pending
-- buffer, and pending_card_stats is not watched by that trigger. The stored
-- legacy encoding is a separate, larger data cleanup.

create or replace function public.pm_train_player(p_team_id uuid, p_player_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_player public.pm_players%rowtype;
  v_squad_position text;
  v_position text;
  v_staff_training_pct integer := 0;
  v_extra_roll_applied boolean := false;
  v_rolls integer := 1;
  v_old_ovr smallint;
  v_pending_ovr smallint;
  v_new_ovr smallint;
  v_cap_ovr smallint;
  v_focus text[];
  v_label text;
  v_current_value integer;
  v_stat_gain integer := 0;
  v_candidate jsonb;
  v_pending jsonb;
  v_improved_stats text[] := '{}';
  v_total_days integer;
  v_train_used smallint;
  v_train_day integer;
  v_capacity integer;
begin
  select p.*
  into v_player
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where p.id = p_player_id and s.team_id = p_team_id
  for update;

  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  select s.position
  into v_squad_position
  from public.pm_squads s
  where s.player_id = p_player_id and s.team_id = p_team_id
  order by s.id asc
  limit 1;

  if v_player.status != 'active' or coalesce(v_player.injury_matches, 0) > 0 then
    raise exception 'player_unavailable';
  end if;

  v_position := upper(coalesce(nullif(v_player.primary_position, ''), v_squad_position, 'CM'));

  select coalesce(sum(
    case
      when s.role_key = 'gk_coach' and v_position = 'GK' then s.level * 6
      when s.role_key = 'defence_coach' and v_position in ('CB', 'LB', 'RB') then s.level * 5
      when s.role_key = 'midfield_coach' and v_position in ('CDM', 'CM', 'CAM', 'AM', 'LM', 'RM') then s.level * 5
      when s.role_key = 'attack_coach' and v_position in ('LW', 'RW', 'ST', 'CF') then s.level * 5
      else 0
    end
  ), 0)::integer
  into v_staff_training_pct
  from public.pm_staff s
  where s.team_id = p_team_id;

  if v_staff_training_pct > 0 and random() < least(0.9, v_staff_training_pct::numeric / 100.0) then
    v_extra_roll_applied := true;
    v_rolls := 2;
  end if;

  v_old_ovr := v_player.ovr_current;
  v_cap_ovr := v_player.ovr_base + public.pm_player_ovr_growth_cap(v_player.talent);

  v_pending := coalesce(
    v_player.pending_card_stats,
    v_player.card_stats,
    v_player.base_card_stats,
    public.pm_player_seed_card_stats(v_position, v_player.ovr_base)
  );
  -- Legacy rows store stats as a double-encoded jsonb string — decode it to the
  -- real object so we train from true attributes, not a reseed.
  if jsonb_typeof(v_pending) = 'string' then
    begin
      v_pending := (v_pending #>> '{}')::jsonb;
    exception when others then
      v_pending := public.pm_player_seed_card_stats(v_position, coalesce(v_player.ovr_base, v_player.ovr_current, 60)::smallint);
    end;
  end if;
  if jsonb_typeof(v_pending) is distinct from 'object' then
    v_pending := public.pm_player_seed_card_stats(v_position, coalesce(v_player.ovr_base, v_player.ovr_current, 60)::smallint);
  end if;

  v_pending_ovr := public.pm_player_overall_from_stats(v_position, v_pending, v_old_ovr);
  if v_pending_ovr >= v_cap_ovr then
    raise exception 'player_maxed';
  end if;

  perform public.pm_ensure_calendar(p_team_id);
  select total_days, train_used, train_day
  into v_total_days, v_train_used, v_train_day
  from public.pm_calendar
  where team_id = p_team_id
  for update;

  if v_train_day is distinct from v_total_days then
    v_train_used := 0;
    v_train_day := v_total_days;
  end if;

  v_capacity := public.pm_training_capacity(p_team_id);
  if v_train_used >= v_capacity then
    raise exception 'training_quota_reached';
  end if;

  v_focus := public.pm_player_training_focus(v_position);

  foreach v_label in array v_focus loop
    exit when v_stat_gain >= v_rolls;

    v_current_value := coalesce((v_pending ->> v_label)::integer, 35);
    if v_current_value >= 99 then
      continue;
    end if;

    v_candidate := jsonb_set(v_pending, array[v_label], to_jsonb(v_current_value + 1), true);
    v_new_ovr := public.pm_player_overall_from_stats(v_position, v_candidate, v_old_ovr);

    if v_new_ovr > v_cap_ovr then
      continue;
    end if;

    v_pending := v_candidate;
    v_stat_gain := v_stat_gain + 1;
    v_improved_stats := array_append(v_improved_stats, v_label);
  end loop;

  if v_stat_gain = 0 then
    raise exception 'player_maxed';
  end if;

  v_new_ovr := public.pm_player_overall_from_stats(v_position, v_pending, v_old_ovr);

  update public.pm_players
  set
    pending_card_stats = v_pending,
    fatigue = least(100, fatigue + 8),
    morale = least(100, morale + 3)
  where id = p_player_id;

  update public.pm_calendar
  set train_used = v_train_used + 1, train_day = v_train_day
  where team_id = p_team_id;

  return jsonb_build_object(
    'playerId', p_player_id,
    'ovrCurrent', v_old_ovr,
    'pendingOvr', v_new_ovr,
    'upgradable', v_new_ovr > v_old_ovr,
    'statGain', v_stat_gain,
    'improvedStats', v_improved_stats,
    'staffTrainingBonusPct', v_staff_training_pct,
    'positionCoachApplied', v_extra_roll_applied,
    'trainUsed', v_train_used + 1,
    'trainCapacity', v_capacity
  );
end;
$function$;

revoke execute on function public.pm_train_player(uuid, uuid) from anon, authenticated, public;
grant  execute on function public.pm_train_player(uuid, uuid) to service_role;
