-- Training was ~10-20x faster than playing matches for the SAME development
-- pipeline (pending_card_stats), because the "train" button granted a
-- guaranteed +1 stat (or +2 on a coach proc) FOR FREE every session, while
-- match development (pm_grant_match_development) has to save up XP and spend
-- it against a rising cost curve (50 + val*3 per point). With a shared daily
-- quota of 4+ sessions and a proc chance up to 90%, a manager could bank ~10+
-- points on one player in a single day of clicking — nothing like the pace of
-- actually playing matches.
--
-- Fix: training now feeds the SAME pm_players.xp budget and the SAME cost
-- curve as match development, via a per-session grant that is deliberately
-- smaller than a typical match's grant (base 25 XP + up to +6 from the
-- position coach's level, vs a match's ~80-170 XP depending on age/coach/
-- headroom). A session may or may not buy a full stat point — leftover XP
-- carries over to the next session or match, exactly like match development
-- already does. Coach level still matters (bigger grant + still gates which
-- position group trains at all) but no longer produces guaranteed free points.

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
  v_session_xp_grant integer;
  v_old_ovr smallint;
  v_pending_ovr smallint;
  v_new_ovr smallint;
  v_cap_ovr smallint;
  v_focus text[];
  v_label text;
  v_current_value integer;
  v_stat_gain integer := 0;
  v_candidate jsonb;
  v_candidate_ovr smallint;
  v_pending jsonb;
  v_improved_stats text[] := '{}';
  v_budget integer;
  v_cost integer;
  v_raised boolean;
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

  -- Deliberately weaker than a match: base 25 XP + up to ~6 from a maxed
  -- position coach (staff_training_pct tops out at 30 for gk_coach lvl5).
  v_session_xp_grant := 25 + round(least(30, v_staff_training_pct)::numeric / 5.0);

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

  -- Spend the SAME budget/cost model as pm_grant_match_development: carry
  -- leftover pm_players.xp forward, add this session's grant, then buy as many
  -- focus-stat points as the budget covers (often zero — that's expected and
  -- mirrors a match that doesn't quite afford a point either).
  v_budget := coalesce(v_player.xp, 0) + v_session_xp_grant;
  v_focus := public.pm_player_training_focus(v_position);

  loop
    v_raised := false;
    foreach v_label in array v_focus loop
      v_current_value := coalesce((v_pending ->> v_label)::integer, 35);
      if v_current_value >= 99 then
        continue;
      end if;

      v_candidate := jsonb_set(v_pending, array[v_label], to_jsonb(v_current_value + 1), true);
      v_candidate_ovr := public.pm_player_overall_from_stats(v_position, v_candidate, v_old_ovr);
      if v_candidate_ovr > v_cap_ovr then
        continue;
      end if;

      v_cost := 50 + v_current_value * 3;
      if v_budget >= v_cost then
        v_budget := v_budget - v_cost;
        v_pending := v_candidate;
        v_stat_gain := v_stat_gain + 1;
        v_improved_stats := array_append(v_improved_stats, v_label);
        v_raised := true;
      end if;
    end loop;
    exit when not v_raised;
  end loop;

  v_new_ovr := public.pm_player_overall_from_stats(v_position, v_pending, v_old_ovr);

  -- Session always banks XP + costs fatigue/session, even when it doesn't buy a
  -- full point this time — leftover xp carries to the next session or match.
  update public.pm_players
  set
    pending_card_stats = v_pending,
    xp = v_budget,
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
    'xpGranted', v_session_xp_grant,
    'xpBanked', v_budget,
    'staffTrainingBonusPct', v_staff_training_pct,
    'trainUsed', v_train_used + 1,
    'trainCapacity', v_capacity
  );
end;
$function$;

revoke execute on function public.pm_train_player(uuid, uuid) from anon, authenticated, public;
grant  execute on function public.pm_train_player(uuid, uuid) to service_role;
