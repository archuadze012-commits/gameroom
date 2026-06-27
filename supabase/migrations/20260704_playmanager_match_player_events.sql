-- PlayManager: per-match player events — goalscorers + match ratings.
--
-- pm_match_player_events(team, home_goals, result) is a read-only helper: it
-- samples each home goal to a starter weighted by an attacking-contribution
-- factor, and gives every starter a 5.0–10.0 match rating (base + goals + result
-- + quality-vs-squad + small variance). pm_simulate_league_round calls it after
-- the scoreline is known and embeds the result under matchEngine.playerEvents.
-- Pure analysis — no mutation, no economy impact (form/value feed is a later pass).

create or replace function public.pm_match_player_events(
  p_team_id uuid,
  p_home_goals integer,
  p_result text
) returns jsonb
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  with xi as (
    select
      p.id,
      p.display_name as name,
      upper(coalesce(s.position, p.primary_position, 'CM')) as pos,
      coalesce(p.ovr_current, 60)::numeric as ovr,
      (case upper(coalesce(s.position, p.primary_position, 'CM'))
        when 'ST' then 1.00 when 'CF' then 1.00
        when 'LW' then 0.70 when 'RW' then 0.70
        when 'CAM' then 0.65
        when 'LM' then 0.50 when 'RM' then 0.50
        when 'CM' then 0.45
        when 'CDM' then 0.25
        when 'LB' then 0.20 when 'RB' then 0.20 when 'LWB' then 0.20 when 'RWB' then 0.20
        when 'CB' then 0.15
        when 'GK' then 0.02
        else 0.40
      end + 0.05) as weight
    from public.pm_squads s
    join public.pm_players p on p.id = s.player_id
    where s.team_id = p_team_id
      and coalesce(s.shirt_number, 99) <= 11
      and coalesce(p.status, 'active') = 'active'
      and coalesce(p.injury_matches, 0) = 0
  ),
  avg_ovr as (select coalesce(avg(ovr), 70) as a from xi),
  goals as materialized (
    select picked.id, picked.name
    from generate_series(1, greatest(0, coalesce(p_home_goals, 0))) gs(n)
    cross join lateral (
      select id, name from xi order by -ln(random()) / weight limit 1
    ) picked
  ),
  goal_counts as (
    select id, name, count(*)::int as c from goals group by id, name
  ),
  rated as (
    select
      x.id, x.name, x.pos,
      round(greatest(5.0, least(10.0,
        6.4
        + coalesce(gc.c, 0) * 0.9
        + case p_result when 'W' then 0.5 when 'L' then -0.3 else 0 end
        + (x.ovr - (select a from avg_ovr)) * 0.04
        + (random() - 0.5) * 0.6
      ))::numeric, 1) as rating
    from xi x
    left join goal_counts gc on gc.id = x.id
  )
  select jsonb_build_object(
    'goalscorers', (
      select coalesce(jsonb_agg(jsonb_build_object('playerId', id, 'name', name, 'goals', c) order by c desc, name), '[]'::jsonb)
      from goal_counts
    ),
    'ratings', (
      select coalesce(jsonb_agg(jsonb_build_object('playerId', id, 'name', name, 'position', pos, 'rating', rating) order by rating desc, name), '[]'::jsonb)
      from rated
    )
  );
$$;

grant execute on function public.pm_match_player_events(uuid, integer, text) to service_role;

-- pm_simulate_league_round now calls the helper and embeds matchEngine.playerEvents.
-- (Full body re-applied; only the v_player_events declare + call after v_result +
--  the playerEvents payload key changed vs 20260703_playmanager_stadium.sql.)
create or replace function public.pm_simulate_league_round(
  p_team_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_name text;
  v_round_no smallint;
  v_opponent_name text;
  v_team_form smallint;
  v_opponent_form smallint := 70;
  v_home_goals smallint;
  v_away_goals smallint;
  v_result text;
  v_attendance integer;
  v_income bigint;
  v_fan_mood smallint;
  v_other_clubs text[];
  v_other_home_goals smallint;
  v_other_away_goals smallint;
  v_season_no integer;
  v_state public.pm_season_state%rowtype;
  v_summary jsonb;
  v_settings public.pm_match_settings%rowtype;
  v_finance public.pm_finance_state%rowtype;
  v_avg_ovr numeric := 68;
  v_avg_fatigue numeric := 18;
  v_avg_morale numeric := 78;
  v_injured_count integer := 0;
  v_match_readiness integer := 78;
  v_recovered_count integer := 0;
  v_injured_player_name text;
  v_injury_games smallint := 0;
  v_doctor_recovery_pct integer := 0;
  v_physio_recovery_pct integer := 0;
  v_psychologist_morale_pct integer := 0;
  v_injury_risk_multiplier numeric := 1;
  v_fatigue_load_multiplier numeric := 1;
  v_morale_win_bonus integer := 0;
  v_morale_draw_bonus integer := 0;
  v_morale_loss_reduction integer := 0;
  v_morale_delta integer := 0;
  v_profile jsonb;
  v_attack numeric;
  v_wing numeric;
  v_central numeric;
  v_midfield numeric;
  v_defense numeric;
  v_keeper numeric;
  v_tactical_fit numeric;
  v_opp_base numeric;
  v_opp_attack numeric;
  v_opp_wing numeric;
  v_opp_central numeric;
  v_opp_midfield numeric;
  v_opp_defense numeric;
  v_opp_keeper numeric;
  v_home_xg numeric;
  v_away_xg numeric;
  v_home_style text;
  v_opp_style text;
  v_style_matchup numeric := 0;
  v_home_tactical numeric := 0;
  v_concede_mod numeric := 0;
  v_line_concede numeric := 0;
  v_pac numeric;
  v_sho numeric;
  v_pas numeric;
  v_dri numeric;
  v_def_stat numeric;
  v_phy numeric;
  v_def_pac numeric;
  v_stat_overall numeric;
  v_style_key numeric;
  v_style_fit numeric := 1;
  v_team_tac numeric := 70;
  v_tac_factor numeric := 1;
  v_position_fit numeric := 1;
  v_arena_level smallint := 1;
  v_capacity integer := 22000;
  v_demand_pct numeric := 0.7;
  v_player_events jsonb := jsonb_build_object('goalscorers', '[]'::jsonb, 'ratings', '[]'::jsonb);
begin
  perform public.pm_ensure_season_rows(p_team_id);
  perform public.pm_ensure_match_settings(p_team_id);
  perform public.pm_ensure_finance_state(p_team_id);
  select * into v_state from public.pm_season_state where team_id = p_team_id;
  select * into v_settings from public.pm_match_settings where team_id = p_team_id;
  select * into v_finance from public.pm_finance_state where team_id = p_team_id;

  select coalesce(level, 1) into v_arena_level
  from public.pm_facilities
  where team_id = p_team_id and sprite_key = 'arena';
  v_arena_level := coalesce(v_arena_level, 1);

  select
    coalesce(sum(case when role_key = 'doctor' then level * 8 else 0 end), 0)::integer,
    coalesce(sum(case when role_key = 'physiotherapist' then level * 7 else 0 end), 0)::integer,
    coalesce(sum(case when role_key = 'psychologist' then level * 6 else 0 end), 0)::integer
  into v_doctor_recovery_pct, v_physio_recovery_pct, v_psychologist_morale_pct
  from public.pm_staff
  where team_id = p_team_id;

  v_injury_risk_multiplier := greatest(0.55, 1 - (least(40, v_doctor_recovery_pct)::numeric / 100.0));
  v_fatigue_load_multiplier := greatest(0.62, 1 - (least(35, v_physio_recovery_pct)::numeric / 100.0));
  v_morale_win_bonus := least(3, floor(v_psychologist_morale_pct::numeric / 12.0)::integer);
  v_morale_draw_bonus := least(2, floor(v_psychologist_morale_pct::numeric / 18.0)::integer);
  v_morale_loss_reduction := least(4, floor(v_psychologist_morale_pct::numeric / 8.0)::integer);

  update public.pm_players p
  set
    injury_matches = greatest(0, p.injury_matches - 1 - recovery.extra_days),
    status = case
      when greatest(0, p.injury_matches - 1 - recovery.extra_days) = 0 then 'active'
      else 'injured'
    end,
    morale = least(100, p.morale + 2 + v_morale_draw_bonus)
  from public.pm_squads s
  cross join lateral (
    select case
      when v_doctor_recovery_pct > 0 and random() < least(0.85, v_doctor_recovery_pct::numeric / 100.0) then 1
      else 0
    end as extra_days
  ) recovery
  where s.player_id = p.id and s.team_id = p_team_id and p.injury_matches > 0;

  get diagnostics v_recovered_count = row_count;

  if coalesce(v_state.is_completed, false) then
    v_season_no := v_state.season_no + 1;
    perform public.pm_reset_season_rows(p_team_id, v_season_no);
    select * into v_state from public.pm_season_state where team_id = p_team_id;
  end if;

  select name into v_team_name from public.pm_teams where id = p_team_id;
  if v_team_name is null then
    raise exception 'team_not_found';
  end if;

  select played, form_percent into v_round_no, v_team_form
  from public.pm_season_rows
  where team_id = p_team_id and club_name = v_team_name;

  select
    coalesce(avg(p.ovr_current), 68),
    coalesce(avg(p.fatigue), 18),
    coalesce(avg(p.morale), 78),
    count(*) filter (where p.injury_matches > 0 or p.status = 'injured')
  into v_avg_ovr, v_avg_fatigue, v_avg_morale, v_injured_count
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where s.team_id = p_team_id and coalesce(s.shirt_number, 99) <= 11;

  select club_name, form_percent into v_opponent_name, v_opponent_form
  from public.pm_season_rows
  where team_id = p_team_id and club_name != v_team_name
  order by row_order
  offset (coalesce(v_round_no, 0) % 3)
  limit 1;

  v_round_no := coalesce(v_round_no, 0) + 1;
  v_match_readiness := greatest(35, least(100, round(((v_avg_ovr - 55) * 1.2) + (v_avg_morale * 0.42) - (v_avg_fatigue * 0.38) - (v_injured_count * 7))::numeric));

  v_profile := public.pm_team_match_profile(p_team_id);
  v_attack := coalesce((v_profile->>'attack')::numeric, v_avg_ovr);
  v_wing := coalesce((v_profile->>'wing')::numeric, v_avg_ovr);
  v_central := coalesce((v_profile->>'central')::numeric, v_avg_ovr);
  v_midfield := coalesce((v_profile->>'midfield')::numeric, v_avg_ovr);
  v_defense := coalesce((v_profile->>'defense')::numeric, v_avg_ovr);
  v_keeper := coalesce((v_profile->>'keeper')::numeric, v_avg_ovr);
  v_tactical_fit := coalesce((v_profile->>'tacticalFit')::numeric, 0);
  v_position_fit := coalesce((v_profile->>'positionFit')::numeric, 1);

  v_pac := coalesce((v_profile->'stats'->>'pac')::numeric, v_avg_ovr);
  v_sho := coalesce((v_profile->'stats'->>'sho')::numeric, v_avg_ovr);
  v_pas := coalesce((v_profile->'stats'->>'pas')::numeric, v_avg_ovr);
  v_dri := coalesce((v_profile->'stats'->>'dri')::numeric, v_avg_ovr);
  v_def_stat := coalesce((v_profile->'stats'->>'def')::numeric, v_avg_ovr);
  v_phy := coalesce((v_profile->'stats'->>'phy')::numeric, v_avg_ovr);
  v_def_pac := coalesce((v_profile->'stats'->>'defPac')::numeric, v_pac);
  v_stat_overall := (v_pac + v_sho + v_pas + v_dri + v_def_stat + v_phy) / 6;
  v_team_tac := coalesce((v_profile->'stats'->>'tac')::numeric, 70);
  v_tac_factor := greatest(0.8, least(1.15, 0.85 + (v_team_tac - 70) / 200.0));

  v_opp_base := greatest(52, least(90, 57 + (coalesce(v_opponent_form, 70) - 50) * 0.32 + coalesce(v_round_no, 1) * 1.6));
  v_opp_attack := v_opp_base + case when coalesce(v_opponent_form, 70) >= 78 then 2 else 0 end;
  v_opp_wing := v_opp_base + floor(random() * 5) - 2;
  v_opp_central := v_opp_base + floor(random() * 5) - 2;
  v_opp_midfield := v_opp_base + case when coalesce(v_opponent_form, 70) >= 72 then 2 else -1 end;
  v_opp_defense := v_opp_base + case when coalesce(v_opponent_form, 70) <= 58 then -2 else 1 end;
  v_opp_keeper := v_opp_base + floor(random() * 5) - 2;

  v_home_style := coalesce(v_settings.tactical_style, 'balanced');

  v_opp_style := (array['pressing','possession','counter','balanced'])[
    (floor(coalesce(v_opponent_form, 70) + coalesce(v_round_no, 1) * 7)::int % 4) + 1
  ];

  v_style_matchup := case
    when v_home_style = v_opp_style then 0
    when (v_home_style, v_opp_style) in (('pressing','possession'), ('possession','counter'), ('counter','pressing')) then 0.38
    when (v_home_style, v_opp_style) in (('possession','pressing'), ('counter','possession'), ('pressing','counter')) then -0.38
    else 0
  end;

  v_style_key := case v_home_style
    when 'pressing' then (v_phy + v_pac + v_def_stat) / 3
    when 'possession' then (v_pas + v_dri) / 2
    when 'counter' then (v_pac + v_sho + v_dri) / 3
    else v_stat_overall
  end;
  v_style_fit := greatest(0.5, least(1.5, 1 + (v_style_key - v_stat_overall) / 12));

  v_home_tactical :=
      (
        case v_home_style when 'pressing' then 0.25 when 'possession' then 0.15 when 'counter' then 0.10 else 0.05 end
        + v_style_matchup
        + case when v_home_style = 'counter' and v_opp_base >= 70 then 0.25 else 0 end
      ) * v_style_fit * v_tac_factor
    + case v_settings.defensive_line when 'high' then 0.30 when 'low' then -0.20 else 0 end
    + case v_settings.tempo when 'direct' then 0.25 when 'controlled' then -0.10 else 0 end
    + case when v_settings.focus_side in ('left','right','center') then 0.12 else 0 end;
  v_home_tactical := greatest(-0.6, least(1.2, v_home_tactical));

  v_line_concede := case v_settings.defensive_line
    when 'high' then greatest(0.12, least(0.55, 0.35 + (72 - v_def_pac) * 0.012))
    when 'low' then -0.30
    else 0
  end;

  v_concede_mod :=
      case v_home_style when 'pressing' then 0.20 when 'possession' then -0.25 when 'counter' then -0.15 else 0 end
    + v_line_concede
    + case v_settings.tempo when 'controlled' then -0.20 when 'direct' then 0.10 else 0 end
    - v_style_matchup * 0.5;
  v_concede_mod := greatest(-0.6, least(0.85, v_concede_mod));

  v_home_xg := greatest(0.15, least(3.8,
    0.9
    + (((v_attack + v_wing + v_central) / 3) - ((v_opp_defense * 0.72) + (v_opp_keeper * 0.28))) / 22
    + (v_midfield - v_opp_midfield) / 55
    + (v_match_readiness - coalesce(v_opponent_form, 70)) / 80
    + v_home_tactical
  ));
  v_away_xg := greatest(0.15, least(3.8,
    0.85
    + (((v_opp_attack + v_opp_wing + v_opp_central) / 3) - ((v_defense * 0.72) + (v_keeper * 0.28))) / 22
    + (v_opp_midfield - v_midfield) / 55
    + (coalesce(v_opponent_form, 70) - v_match_readiness) / 80
    + v_concede_mod
  ));

  v_home_goals := greatest(0, least(5, round(v_home_xg + (random() - 0.5) * 0.8 + case when random() > 0.88 then 0.7 when random() < 0.12 then -0.5 else 0 end)::smallint));
  v_away_goals := greatest(0, least(5, round(v_away_xg + (random() - 0.5) * 0.8 + case when random() > 0.88 then 0.7 when random() < 0.12 then -0.5 else 0 end)::smallint));

  v_result := case
    when v_home_goals > v_away_goals then 'W'
    when v_home_goals = v_away_goals then 'D'
    else 'L'
  end;

  v_player_events := public.pm_match_player_events(p_team_id, v_home_goals, v_result);

  v_morale_delta := case
    when v_result = 'W' then 6 + v_morale_win_bonus
    when v_result = 'D' then 1 + v_morale_draw_bonus
    else -(greatest(1, 5 - v_morale_loss_reduction))
  end;

  v_capacity := public.pm_stadium_capacity(v_arena_level);
  v_demand_pct :=
      0.763
    + greatest(45, least(100, coalesce(v_team_form, 70))) * 0.00093
    + greatest(35, least(100, v_match_readiness)) * 0.00044
    + greatest(-0.155, least(0.10, (28 - coalesce(v_finance.ticket_price, 28)) * 0.0115));
  v_attendance := greatest(round(v_capacity * 0.40)::integer, least(v_capacity, round(v_capacity * v_demand_pct)::integer));

  v_income := (round(((v_attendance * coalesce(v_finance.ticket_price, 28)) + (case when v_result = 'W' then 70000 when v_result = 'D' then 30000 else 0 end))::numeric / 500) * 500)::bigint;
  v_fan_mood := least(100, greatest(38, round((coalesce(v_team_form, 70) * 0.55) + (v_avg_morale * 0.2) + case when v_result = 'W' then 12 when v_result = 'D' then 3 else -9 end - greatest(0, coalesce(v_finance.ticket_price, 28) - 34) * 0.8)::numeric));

  perform public.pm_credit(p_team_id, v_income, 'matchday_income');

  update public.pm_season_rows
  set
    played = played + 1,
    won = won + case when v_home_goals > v_away_goals then 1 else 0 end,
    drawn = drawn + case when v_home_goals = v_away_goals then 1 else 0 end,
    lost = lost + case when v_home_goals < v_away_goals then 1 else 0 end,
    goals_for = goals_for + v_home_goals,
    goals_against = goals_against + v_away_goals,
    points = points + case when v_home_goals > v_away_goals then 3 when v_home_goals = v_away_goals then 1 else 0 end,
    form_percent = least(100, greatest(45, form_percent + case when v_home_goals > v_away_goals then 6 when v_home_goals = v_away_goals then 1 else -5 end)),
    updated_at = now()
  where team_id = p_team_id and club_name = v_team_name;

  update public.pm_season_rows
  set
    played = played + 1,
    won = won + case when v_away_goals > v_home_goals then 1 else 0 end,
    drawn = drawn + case when v_home_goals = v_away_goals then 1 else 0 end,
    lost = lost + case when v_away_goals < v_home_goals then 1 else 0 end,
    goals_for = goals_for + v_away_goals,
    goals_against = goals_against + v_home_goals,
    points = points + case when v_away_goals > v_home_goals then 3 when v_home_goals = v_away_goals then 1 else 0 end,
    form_percent = least(100, greatest(45, form_percent + case when v_away_goals > v_home_goals then 6 when v_home_goals = v_away_goals then 1 else -5 end)),
    updated_at = now()
  where team_id = p_team_id and club_name = v_opponent_name;

  select array_agg(club_name order by row_order) into v_other_clubs
  from public.pm_season_rows
  where team_id = p_team_id and club_name not in (v_team_name, v_opponent_name);

  if coalesce(array_length(v_other_clubs, 1), 0) = 2 then
    v_other_home_goals := floor(random() * 4)::smallint;
    v_other_away_goals := floor(random() * 4)::smallint;

    update public.pm_season_rows
    set played = played + 1,
        won = won + case when v_other_home_goals > v_other_away_goals then 1 else 0 end,
        drawn = drawn + case when v_other_home_goals = v_other_away_goals then 1 else 0 end,
        lost = lost + case when v_other_home_goals < v_other_away_goals then 1 else 0 end,
        goals_for = goals_for + v_other_home_goals,
        goals_against = goals_against + v_other_away_goals,
        points = points + case when v_other_home_goals > v_other_away_goals then 3 when v_other_home_goals = v_other_away_goals then 1 else 0 end,
        updated_at = now()
    where team_id = p_team_id and club_name = v_other_clubs[1];

    update public.pm_season_rows
    set played = played + 1,
        won = won + case when v_other_away_goals > v_other_home_goals then 1 else 0 end,
        drawn = drawn + case when v_other_home_goals = v_other_away_goals then 1 else 0 end,
        lost = lost + case when v_other_away_goals < v_other_home_goals then 1 else 0 end,
        goals_for = goals_for + v_other_away_goals,
        goals_against = goals_against + v_other_home_goals,
        points = points + case when v_other_away_goals > v_other_home_goals then 3 when v_other_home_goals = v_other_away_goals then 1 else 0 end,
        updated_at = now()
    where team_id = p_team_id and club_name = v_other_clubs[2];
  end if;

  update public.pm_players p
  set
    fatigue = least(100, greatest(0, p.fatigue + floor(((case when coalesce(s.shirt_number, 99) <= 11 then 16 when coalesce(s.shirt_number, 99) <= 15 then 8 else 3 end - case when v_settings.tempo = 'controlled' then 3 else 0 end) * v_fatigue_load_multiplier)::numeric))),
    morale = least(100, greatest(0, p.morale + v_morale_delta)),
    injury_matches = case
      when p.status = 'active' and coalesce(s.shirt_number, 99) <= 11 and injury_roll.triggered then 1 + floor(random() * 3)::smallint
      else p.injury_matches
    end,
    status = case
      when p.status = 'active' and coalesce(s.shirt_number, 99) <= 11 and injury_roll.triggered then 'injured'
      when p.injury_matches > 0 then 'injured'
      else p.status
    end
  from public.pm_squads s
  cross join lateral (
    select (
      random() < (
        greatest(0.03, least(0.22, ((p.fatigue + case when v_settings.tactical_style = 'pressing' then 10 else 0 end + case when v_settings.defensive_line = 'high' then 6 else 0 end)::numeric / 300.0)))
        * v_injury_risk_multiplier
      )
    ) as triggered
  ) injury_roll
  where s.player_id = p.id and s.team_id = p_team_id;

  select p.display_name, p.injury_matches
  into v_injured_player_name, v_injury_games
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where s.team_id = p_team_id and p.status = 'injured'
  order by p.injury_matches desc, p.created_at desc
  limit 1;

  insert into public.pm_match_history (
    team_id, round_no, opponent_name, venue, scored, conceded, result, attendance, income, fan_mood
  ) values (
    p_team_id, v_round_no, v_opponent_name, 'Home', v_home_goals, v_away_goals, v_result, v_attendance, v_income, v_fan_mood
  )
  on conflict (team_id, round_no) do update
    set opponent_name = excluded.opponent_name, venue = excluded.venue, scored = excluded.scored,
        conceded = excluded.conceded, result = excluded.result, attendance = excluded.attendance,
        income = excluded.income, fan_mood = excluded.fan_mood, created_at = now();

  if v_round_no >= 3 then
    v_summary := public.pm_finalize_season(p_team_id);
  end if;

  return jsonb_build_object(
    'season', coalesce(v_state.season_no, 1),
    'round', v_round_no,
    'opponent', v_opponent_name,
    'score', format('%s %s - %s %s', v_team_name, v_home_goals, v_away_goals, v_opponent_name),
    'result', v_result,
    'attendance', v_attendance,
    'capacity', v_capacity,
    'stadiumLevel', v_arena_level,
    'income', v_income,
    'formPercent', (select form_percent from public.pm_season_rows where team_id = p_team_id and club_name = v_team_name),
    'seasonSummary', v_summary,
    'readiness', v_match_readiness,
    'tacticalStyle', v_settings.tactical_style,
    'defensiveLine', v_settings.defensive_line,
    'tempo', v_settings.tempo,
    'focusSide', v_settings.focus_side,
    'ticketPrice', v_finance.ticket_price,
    'sponsorTier', v_finance.sponsor_tier,
    'matchEngine', jsonb_build_object(
      'homeXg', round(v_home_xg, 2),
      'awayXg', round(v_away_xg, 2),
      'profile', v_profile,
      'playerEvents', v_player_events,
      'tactics', jsonb_build_object(
        'homeStyle', v_home_style,
        'opponentStyle', v_opp_style,
        'styleMatchup', v_style_matchup,
        'styleFit', round(v_style_fit, 2),
        'teamTac', round(v_team_tac, 1),
        'tacFactor', round(v_tac_factor, 3),
        'attackMod', round(v_home_tactical, 2),
        'concedeMod', round(v_concede_mod, 2),
        'positionFit', round(v_position_fit, 3)
      ),
      'opponentProfile', jsonb_build_object(
        'attack', round(v_opp_attack, 2),
        'wing', round(v_opp_wing, 2),
        'central', round(v_opp_central, 2),
        'midfield', round(v_opp_midfield, 2),
        'defense', round(v_opp_defense, 2),
        'keeper', round(v_opp_keeper, 2),
        'form', v_opponent_form
      )
    ),
    'injuryUpdate', case when v_injured_player_name is not null then jsonb_build_object('playerName', v_injured_player_name, 'matches', v_injury_games) else null end,
    'recoveredCount', v_recovered_count
  );
end;
$$;

grant execute on function public.pm_simulate_league_round(uuid) to service_role;
