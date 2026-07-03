-- PlayManager training cadence overhaul: instead of a team-wide DAILY session
-- quota (which refilled on ANY day-advance — buying/selling a player leaked a
-- free refill), each player can now be trained EXACTLY ONCE per league match.
--
-- The "match window" is identified by the count of league matches the team has
-- played (rows in pm_match_history — the natural, already-maintained match
-- counter, written only by pm_simulate_league_round). A player stores the
-- window index it was last trained in (pm_players.last_train_match); training
-- is allowed only when that differs from the current match count. Default -1 so
-- a freshly seeded/pre-season player (match count 0) can train once before the
-- first match, then must wait for the next matchday.

alter table public.pm_players
  add column if not exists last_train_match integer not null default -1;

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
  v_matches_played integer;
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

  -- One training session per player per league match. The window id is the
  -- number of league matches played so far; a player trained in the current
  -- window must wait for the next matchday.
  select count(*)::integer
  into v_matches_played
  from public.pm_match_history
  where team_id = p_team_id;

  if coalesce(v_player.last_train_match, -1) = v_matches_played then
    raise exception 'already_trained_this_match';
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

  v_session_xp_grant := 25 + round(least(30, v_staff_training_pct)::numeric / 5.0);

  v_old_ovr := v_player.ovr_current;
  v_cap_ovr := v_player.ovr_base + public.pm_player_ovr_growth_cap(v_player.talent);

  v_pending := coalesce(
    v_player.pending_card_stats,
    v_player.card_stats,
    v_player.base_card_stats,
    public.pm_player_seed_card_stats(v_position, v_player.ovr_base)
  );
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

  update public.pm_players
  set
    pending_card_stats = v_pending,
    xp = v_budget,
    last_train_match = v_matches_played,
    fatigue = least(100, fatigue + 8),
    morale = least(100, morale + 3)
  where id = p_player_id;

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
    'matchesPlayed', v_matches_played
  );
end;
$function$;

-- SECURITY DEFINER RPC must never be callable by anon/authenticated directly
-- (mirrors the grant-leak hardening applied to every pm_* definer function).
revoke all on function public.pm_train_player(uuid, uuid) from anon, authenticated;

-- Season reset wipes pm_match_history (match count → 0); clear the per-player
-- window marker too so the new pre-season window unlocks cleanly for everyone.
create or replace function public.pm_reset_season_rows(p_team_id uuid, p_season_no integer)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_team_name text;
begin
  select name into v_team_name from public.pm_teams where id = p_team_id;
  if v_team_name is null then
    raise exception 'team_not_found';
  end if;

  delete from public.pm_match_history where team_id = p_team_id;
  delete from public.pm_season_rows where team_id = p_team_id;

  update public.pm_players p
  set last_train_match = -1
  from public.pm_squads s
  where s.player_id = p.id and s.team_id = p_team_id;

  insert into public.pm_season_rows (
    team_id, club_name, played, won, drawn, lost, goals_for, goals_against, points, form_percent, row_order
  ) values
    (p_team_id, v_team_name, 0, 0, 0, 0, 0, 0, 0, 100, 1),
    (p_team_id, 'North London', 0, 0, 0, 0, 0, 0, 0, 92, 2),
    (p_team_id, 'Royal Madrid', 0, 0, 0, 0, 0, 0, 0, 88, 3),
    (p_team_id, 'Milano Black', 0, 0, 0, 0, 0, 0, 0, 81, 4);

  update public.pm_season_state
  set
    season_no = p_season_no,
    is_completed = false,
    updated_at = now()
  where team_id = p_team_id;
end;
$function$;

revoke all on function public.pm_reset_season_rows(uuid, integer) from anon, authenticated;
