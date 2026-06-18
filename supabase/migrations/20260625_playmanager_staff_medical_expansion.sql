create or replace function public.pm_staff_hire_cost(p_role_key text)
returns integer
language sql
stable
as $$
  select case p_role_key
    when 'head_coach' then 140000
    when 'gk_coach' then 95000
    when 'defence_coach' then 100000
    when 'attack_coach' then 108000
    when 'scout' then 88000
    when 'youth_scout' then 92000
    when 'doctor' then 120000
    when 'physiotherapist' then 98000
    when 'psychologist' then 90000
    when 'finance_manager' then 110000
    else 0
  end;
$$;

create or replace function public.pm_hire_staff(
  p_team_id uuid,
  p_role_key text
)
returns table (
  role_key text,
  level smallint
)
language plpgsql
as $$
declare
  v_cost integer;
begin
  if p_role_key not in (
    'head_coach',
    'gk_coach',
    'defence_coach',
    'attack_coach',
    'scout',
    'youth_scout',
    'doctor',
    'physiotherapist',
    'psychologist',
    'finance_manager'
  ) then
    raise exception 'invalid_staff_role';
  end if;

  if exists (
    select 1 from public.pm_staff s
    where s.team_id = p_team_id and s.role_key = p_role_key
  ) then
    raise exception 'staff_already_hired';
  end if;

  v_cost := public.pm_staff_hire_cost(p_role_key);
  if v_cost <= 0 then
    raise exception 'invalid_staff_role';
  end if;

  perform public.pm_debit(p_team_id, v_cost, 'staff_hire:' || p_role_key);

  insert into public.pm_staff (team_id, role_key, level)
  values (p_team_id, p_role_key, 1);

  return query
  select s.role_key, s.level
  from public.pm_staff s
  where s.team_id = p_team_id and s.role_key = p_role_key;
end;
$$;

create or replace function public.pm_advance_time(
  p_team_id uuid,
  p_days integer default 1
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_calendar public.pm_calendar%rowtype;
  v_days integer := greatest(1, coalesce(p_days, 1));
  v_total integer;
  v_prev_week integer;
  v_new_week integer;
  v_doctor_recovery_pct integer := 0;
  v_physio_recovery_pct integer := 0;
  v_psychologist_morale_pct integer := 0;
  v_fatigue_recovery integer := 0;
  v_morale_recovery integer := 0;
begin
  perform public.pm_ensure_calendar(p_team_id);
  perform public.pm_ensure_finance_state(p_team_id);

  select
    coalesce(sum(case when role_key = 'doctor' then level * 8 else 0 end), 0)::integer,
    coalesce(sum(case when role_key = 'physiotherapist' then level * 7 else 0 end), 0)::integer,
    coalesce(sum(case when role_key = 'psychologist' then level * 6 else 0 end), 0)::integer
  into v_doctor_recovery_pct, v_physio_recovery_pct, v_psychologist_morale_pct
  from public.pm_staff
  where team_id = p_team_id;

  v_fatigue_recovery := greatest(2, (v_days * 3) + floor((v_physio_recovery_pct * v_days)::numeric / 14.0)::integer);
  v_morale_recovery := greatest(0, floor((v_psychologist_morale_pct * v_days)::numeric / 12.0)::integer);

  update public.pm_players p
  set
    injury_matches = greatest(0, p.injury_matches - v_days - recovery.extra_days),
    status = case
      when greatest(0, p.injury_matches - v_days - recovery.extra_days) = 0 then 'active'
      else 'injured'
    end,
    morale = least(100, p.morale + least(8, v_days * 2) + v_morale_recovery)
  from public.pm_squads s
  cross join lateral (
    select case
      when v_doctor_recovery_pct > 0
       and random() < least(0.85, (v_doctor_recovery_pct::numeric / 100.0) * greatest(1, v_days))
      then 1
      else 0
    end as extra_days
  ) recovery
  where s.player_id = p.id
    and s.team_id = p_team_id
    and p.injury_matches > 0;

  update public.pm_players p
  set
    fatigue = greatest(0, p.fatigue - v_fatigue_recovery),
    morale = least(100, p.morale + v_morale_recovery)
  from public.pm_squads s
  where s.player_id = p.id
    and s.team_id = p_team_id;

  select * into v_calendar
  from public.pm_calendar
  where team_id = p_team_id
  for update;

  v_prev_week := v_calendar.week_no;
  v_total := v_calendar.total_days + v_days;
  v_new_week := (((v_total - 1) / 7) + 1);

  update public.pm_calendar
  set
    total_days = v_total,
    week_no = v_new_week,
    day_no = (((v_total - 1) % 7) + 1),
    updated_at = now()
  where team_id = p_team_id
  returning * into v_calendar;

  if v_new_week > v_prev_week then
    while v_prev_week < v_new_week loop
      v_prev_week := v_prev_week + 1;
      perform public.pm_apply_weekly_finance(p_team_id, v_prev_week);
    end loop;
  end if;

  return jsonb_build_object(
    'weekNo', v_calendar.week_no,
    'dayNo', v_calendar.day_no,
    'totalDays', v_calendar.total_days
  );
end;
$$;

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
  v_attack_bonus integer := 0;
  v_defense_bonus integer := 0;
  v_focus_bonus integer := 0;
  v_recovered_count integer := 0;
  v_injured_player_name text;
  v_injury_games smallint := 0;
  v_ticket_effect integer := 0;
  v_doctor_recovery_pct integer := 0;
  v_physio_recovery_pct integer := 0;
  v_psychologist_morale_pct integer := 0;
  v_injury_risk_multiplier numeric := 1;
  v_fatigue_load_multiplier numeric := 1;
  v_morale_win_bonus integer := 0;
  v_morale_draw_bonus integer := 0;
  v_morale_loss_reduction integer := 0;
  v_morale_delta integer := 0;
begin
  perform public.pm_ensure_season_rows(p_team_id);
  perform public.pm_ensure_match_settings(p_team_id);
  perform public.pm_ensure_finance_state(p_team_id);
  select * into v_state from public.pm_season_state where team_id = p_team_id;
  select * into v_settings from public.pm_match_settings where team_id = p_team_id;
  select * into v_finance from public.pm_finance_state where team_id = p_team_id;

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
      when v_doctor_recovery_pct > 0 and random() < least(0.85, v_doctor_recovery_pct::numeric / 100.0)
      then 1
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

  select club_name into v_opponent_name
  from public.pm_season_rows
  where team_id = p_team_id and club_name != v_team_name
  order by row_order
  offset (coalesce(v_round_no, 0) % 3)
  limit 1;

  v_round_no := coalesce(v_round_no, 0) + 1;
  v_match_readiness := greatest(35, least(100, round(((v_avg_ovr - 55) * 1.2) + (v_avg_morale * 0.42) - (v_avg_fatigue * 0.38) - (v_injured_count * 7))::numeric));

  if v_settings.tactical_style = 'pressing' then
    v_attack_bonus := v_attack_bonus + 1;
    v_defense_bonus := v_defense_bonus - 1;
  elsif v_settings.tactical_style = 'possession' then
    v_attack_bonus := v_attack_bonus + 1;
  elsif v_settings.tactical_style = 'counter' then
    v_attack_bonus := v_attack_bonus + 2;
    v_defense_bonus := v_defense_bonus - 1;
  end if;

  if v_settings.defensive_line = 'high' then
    v_attack_bonus := v_attack_bonus + 1;
    v_defense_bonus := v_defense_bonus - 1;
  elsif v_settings.defensive_line = 'low' then
    v_defense_bonus := v_defense_bonus + 1;
  end if;

  if v_settings.tempo = 'direct' then
    v_attack_bonus := v_attack_bonus + 1;
  elsif v_settings.tempo = 'controlled' then
    v_defense_bonus := v_defense_bonus + 1;
  end if;

  if v_settings.focus_side = 'center' then
    v_focus_bonus := 1;
  end if;

  v_home_goals := greatest(0, least(5,
    floor(random() * 3 + case when coalesce(v_team_form, 70) >= 85 then 1 else 0 end + case when v_match_readiness >= 82 then 1 else 0 end + v_attack_bonus + v_focus_bonus)::smallint));
  v_away_goals := greatest(0, least(4,
    floor(random() * 3 + case when coalesce(v_team_form, 70) <= 55 then 1 else 0 end + case when v_match_readiness <= 58 then 1 else 0 end - v_defense_bonus)::smallint));

  v_result := case
    when v_home_goals > v_away_goals then 'W'
    when v_home_goals = v_away_goals then 'D'
    else 'L'
  end;

  v_morale_delta := case
    when v_result = 'W' then 6 + v_morale_win_bonus
    when v_result = 'D' then 1 + v_morale_draw_bonus
    else -(greatest(1, 5 - v_morale_loss_reduction))
  end;

  v_ticket_effect := greatest(-7000, least(4500, (28 - coalesce(v_finance.ticket_price, 28)) * 520));
  v_attendance := least(45000, greatest(18000,
    34300 + floor(random() * 8000)::integer + (coalesce(v_team_form, 70) * 42) + (v_match_readiness * 20) + v_ticket_effect));
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
    set
      played = played + 1,
      won = won + case when v_other_home_goals > v_other_away_goals then 1 else 0 end,
      drawn = drawn + case when v_other_home_goals = v_other_away_goals then 1 else 0 end,
      lost = lost + case when v_other_home_goals < v_other_away_goals then 1 else 0 end,
      goals_for = goals_for + v_other_home_goals,
      goals_against = goals_against + v_other_away_goals,
      points = points + case when v_other_home_goals > v_other_away_goals then 3 when v_other_home_goals = v_other_away_goals then 1 else 0 end,
      updated_at = now()
    where team_id = p_team_id and club_name = v_other_clubs[1];

    update public.pm_season_rows
    set
      played = played + 1,
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
    fatigue = least(
      100,
      greatest(
        0,
        p.fatigue + floor((
          (case when coalesce(s.shirt_number, 99) <= 11 then 16 when coalesce(s.shirt_number, 99) <= 15 then 8 else 3 end - case when v_settings.tempo = 'controlled' then 3 else 0 end)
          * v_fatigue_load_multiplier
        )::numeric)
      )
    ),
    morale = least(100, greatest(0, p.morale + v_morale_delta)),
    injury_matches = case
      when p.status = 'active' and coalesce(s.shirt_number, 99) <= 11 and injury_roll.triggered
      then 1 + floor(random() * 3)::smallint
      else p.injury_matches
    end,
    status = case
      when p.status = 'active' and coalesce(s.shirt_number, 99) <= 11 and injury_roll.triggered
      then 'injured'
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
    'injuryUpdate', case when v_injured_player_name is not null then jsonb_build_object('playerName', v_injured_player_name, 'matches', v_injury_games) else null end,
    'recoveredCount', v_recovered_count
  );
end;
$$;

grant execute on function public.pm_staff_hire_cost(text) to authenticated, service_role;
grant execute on function public.pm_hire_staff(uuid, text) to authenticated, service_role;
grant execute on function public.pm_advance_time(uuid, integer) to service_role;
grant execute on function public.pm_simulate_league_round(uuid) to service_role;
