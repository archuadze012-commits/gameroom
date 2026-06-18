create table if not exists public.pm_finance_state (
  team_id uuid primary key references public.pm_teams(id) on delete cascade,
  ticket_price integer not null default 28 check (ticket_price between 10 and 80),
  sponsor_tier text not null default 'local' check (sponsor_tier in ('local','regional','global')),
  sponsor_weekly_amount bigint not null default 85000 check (sponsor_weekly_amount >= 0),
  last_settled_week integer not null default 0 check (last_settled_week >= 0),
  updated_at timestamptz not null default now()
);

alter table public.pm_finance_state enable row level security;

drop policy if exists "pm_finance_state_owner_select" on public.pm_finance_state;
create policy "pm_finance_state_owner_select"
on public.pm_finance_state
for select
using (
  team_id in (select id from public.pm_teams where user_id = auth.uid())
);

create or replace function public.pm_ensure_finance_state(
  p_team_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.pm_finance_state (team_id)
  values (p_team_id)
  on conflict (team_id) do nothing;
end;
$$;

create or replace function public.pm_calculate_weekly_wages(
  p_team_id uuid
) returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total bigint;
begin
  select coalesce(sum((p.ovr_current * 180) + (p.age * 40) + (case when coalesce(s.shirt_number, 99) <= 11 then 2200 else 900 end)), 0)
  into v_total
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where s.team_id = p_team_id;

  return (round(coalesce(v_total, 0)::numeric / 500) * 500)::bigint;
end;
$$;

create or replace function public.pm_save_ticket_price(
  p_team_id uuid,
  p_ticket_price integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_state public.pm_finance_state%rowtype;
begin
  if p_ticket_price < 10 or p_ticket_price > 80 then
    raise exception 'invalid_ticket_price';
  end if;

  perform public.pm_ensure_finance_state(p_team_id);

  update public.pm_finance_state
  set
    ticket_price = p_ticket_price,
    updated_at = now()
  where team_id = p_team_id
  returning * into v_state;

  return jsonb_build_object(
    'ticketPrice', v_state.ticket_price,
    'sponsorTier', v_state.sponsor_tier,
    'sponsorWeeklyAmount', v_state.sponsor_weekly_amount
  );
end;
$$;

create or replace function public.pm_negotiate_sponsor(
  p_team_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_state public.pm_finance_state%rowtype;
  v_division integer := 1;
  v_roll numeric;
  v_tier text;
  v_amount bigint;
begin
  perform public.pm_ensure_finance_state(p_team_id);

  select division_id into v_division
  from public.pm_teams
  where id = p_team_id;

  v_roll := random();
  if v_division = 1 and v_roll > 0.58 then
    v_tier := 'global';
    v_amount := 220000 + floor(random() * 30000)::bigint;
  elsif v_division <= 2 and v_roll > 0.26 then
    v_tier := 'regional';
    v_amount := 145000 + floor(random() * 20000)::bigint;
  else
    v_tier := 'local';
    v_amount := 85000 + floor(random() * 15000)::bigint;
  end if;

  update public.pm_finance_state
  set
    sponsor_tier = v_tier,
    sponsor_weekly_amount = v_amount,
    updated_at = now()
  where team_id = p_team_id
  returning * into v_state;

  return jsonb_build_object(
    'sponsorTier', v_state.sponsor_tier,
    'sponsorWeeklyAmount', v_state.sponsor_weekly_amount
  );
end;
$$;

create or replace function public.pm_apply_weekly_finance(
  p_team_id uuid,
  p_week_no integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_state public.pm_finance_state%rowtype;
  v_wages bigint := 0;
  v_balance bigint := 0;
  v_paid_wages bigint := 0;
  v_wage_shortfall bigint := 0;
begin
  perform public.pm_ensure_finance_state(p_team_id);

  select * into v_state
  from public.pm_finance_state
  where team_id = p_team_id
  for update;

  if v_state.last_settled_week >= p_week_no then
    return jsonb_build_object(
      'weekNo', p_week_no,
      'wages', 0,
      'sponsor', 0
    );
  end if;

  v_wages := public.pm_calculate_weekly_wages(p_team_id);

  if v_state.sponsor_weekly_amount > 0 then
    perform public.pm_credit(p_team_id, v_state.sponsor_weekly_amount, 'weekly_sponsor');
  end if;

  select balance into v_balance
  from public.pm_wallets
  where team_id = p_team_id
  for update;

  v_paid_wages := least(v_wages, greatest(0, coalesce(v_balance, 0)));
  v_wage_shortfall := greatest(0, v_wages - v_paid_wages);

  if v_paid_wages > 0 then
    perform public.pm_debit(p_team_id, v_paid_wages, 'weekly_wages');
  end if;

  if v_wage_shortfall > 0 then
    update public.pm_players p
    set morale = greatest(0, p.morale - 6)
    from public.pm_squads s
    where s.player_id = p.id
      and s.team_id = p_team_id;
  end if;

  update public.pm_finance_state
  set
    last_settled_week = p_week_no,
    updated_at = now()
  where team_id = p_team_id;

  perform public.pm_log_event(
    p_team_id,
    'finance',
    format('კვირეული ფინანსური ციკლი · Week %s', p_week_no),
    format(
      'Sponsor +%s ₾ · Wages -%s ₾%s',
      v_state.sponsor_weekly_amount,
      v_paid_wages,
      case when v_wage_shortfall > 0 then format(' · Shortfall %s ₾', v_wage_shortfall) else '' end
    ),
    case when v_wage_shortfall > 0 then 'red' when v_state.sponsor_weekly_amount >= v_wages then 'green' else 'gold' end
  );

  return jsonb_build_object(
    'weekNo', p_week_no,
    'wages', v_wages,
    'paidWages', v_paid_wages,
    'wageShortfall', v_wage_shortfall,
    'sponsor', v_state.sponsor_weekly_amount
  );
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
begin
  perform public.pm_ensure_calendar(p_team_id);
  perform public.pm_ensure_finance_state(p_team_id);

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
begin
  perform public.pm_ensure_season_rows(p_team_id);
  perform public.pm_ensure_match_settings(p_team_id);
  perform public.pm_ensure_finance_state(p_team_id);
  select * into v_state from public.pm_season_state where team_id = p_team_id;
  select * into v_settings from public.pm_match_settings where team_id = p_team_id;
  select * into v_finance from public.pm_finance_state where team_id = p_team_id;

  update public.pm_players p
  set
    injury_matches = greatest(0, p.injury_matches - 1),
    status = case when greatest(0, p.injury_matches - 1) = 0 then 'active' else 'injured' end,
    morale = least(100, p.morale + 2)
  from public.pm_squads s
  where s.player_id = p.id
    and s.team_id = p_team_id
    and p.injury_matches > 0;

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

  select played, form_percent
  into v_round_no, v_team_form
  from public.pm_season_rows
  where team_id = p_team_id and club_name = v_team_name;

  select
    coalesce(avg(p.ovr_current), 68),
    coalesce(avg(p.fatigue), 18),
    coalesce(avg(p.morale), 78),
    count(*) filter (where p.injury_matches > 0 or p.status = 'injured')
  into
    v_avg_ovr,
    v_avg_fatigue,
    v_avg_morale,
    v_injured_count
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where s.team_id = p_team_id
    and coalesce(s.shirt_number, 99) <= 11;

  select club_name
  into v_opponent_name
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

  v_home_goals := greatest(
    0,
    least(
      5,
      floor(random() * 3 + case when coalesce(v_team_form, 70) >= 85 then 1 else 0 end + case when v_match_readiness >= 82 then 1 else 0 end + v_attack_bonus + v_focus_bonus)::smallint
    )
  );
  v_away_goals := greatest(
    0,
    least(
      4,
      floor(random() * 3 + case when coalesce(v_team_form, 70) <= 55 then 1 else 0 end + case when v_match_readiness <= 58 then 1 else 0 end - v_defense_bonus)::smallint
    )
  );

  v_result := case
    when v_home_goals > v_away_goals then 'W'
    when v_home_goals = v_away_goals then 'D'
    else 'L'
  end;

  v_ticket_effect := greatest(-7000, least(4500, (28 - coalesce(v_finance.ticket_price, 28)) * 520));
  v_attendance := least(
    45000,
    greatest(
    18000,
    34300 + floor(random() * 8000)::integer + (coalesce(v_team_form, 70) * 42) + (v_match_readiness * 20) + v_ticket_effect
    )
  );
  v_income := (
    round(((v_attendance * coalesce(v_finance.ticket_price, 28)) + (case when v_result = 'W' then 70000 when v_result = 'D' then 30000 else 0 end))::numeric / 500) * 500
  )::bigint;
  v_fan_mood := least(100, greatest(38, round((coalesce(v_team_form, 70) * 0.55) + (v_avg_morale * 0.2) + case when v_result = 'W' then 12 when v_result = 'D' then 3 else -9 end - greatest(0, coalesce(v_finance.ticket_price, 28) - 34) * 0.8)::numeric));

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

  select array_agg(club_name order by row_order)
  into v_other_clubs
  from public.pm_season_rows
  where team_id = p_team_id
    and club_name not in (v_team_name, v_opponent_name);

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
    fatigue = least(100, greatest(0, p.fatigue + case when coalesce(s.shirt_number, 99) <= 11 then 16 when coalesce(s.shirt_number, 99) <= 15 then 8 else 3 end - case when v_settings.tempo = 'controlled' then 3 else 0 end)),
    morale = least(100, greatest(0, p.morale + case when v_result = 'W' then 6 when v_result = 'D' then 1 else -5 end)),
    injury_matches = case
      when p.status = 'active'
       and coalesce(s.shirt_number, 99) <= 11
       and random() < greatest(0.03, least(0.22, ((p.fatigue + case when v_settings.tactical_style = 'pressing' then 10 else 0 end + case when v_settings.defensive_line = 'high' then 6 else 0 end)::numeric / 300.0)))
      then 1 + floor(random() * 3)::smallint
      else p.injury_matches
    end,
    status = case
      when p.status = 'active'
       and coalesce(s.shirt_number, 99) <= 11
       and random() < greatest(0.03, least(0.22, ((p.fatigue + case when v_settings.tactical_style = 'pressing' then 10 else 0 end + case when v_settings.defensive_line = 'high' then 6 else 0 end)::numeric / 300.0)))
      then 'injured'
      when p.injury_matches > 0 then 'injured'
      else p.status
    end
  from public.pm_squads s
  where s.player_id = p.id
    and s.team_id = p_team_id;

  select p.display_name, p.injury_matches
  into v_injured_player_name, v_injury_games
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where s.team_id = p_team_id
    and p.status = 'injured'
  order by p.injury_matches desc, p.created_at desc
  limit 1;

  insert into public.pm_match_history (
    team_id, round_no, opponent_name, venue, scored, conceded, result, attendance, income, fan_mood
  ) values (
    p_team_id, v_round_no, v_opponent_name, 'Home', v_home_goals, v_away_goals, v_result, v_attendance, v_income, v_fan_mood
  )
  on conflict (team_id, round_no) do update
    set
      opponent_name = excluded.opponent_name,
      venue = excluded.venue,
      scored = excluded.scored,
      conceded = excluded.conceded,
      result = excluded.result,
      attendance = excluded.attendance,
      income = excluded.income,
      fan_mood = excluded.fan_mood,
      created_at = now();

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

grant execute on function public.pm_ensure_finance_state(uuid) to service_role;
grant execute on function public.pm_calculate_weekly_wages(uuid) to service_role;
grant execute on function public.pm_save_ticket_price(uuid, integer) to service_role;
grant execute on function public.pm_negotiate_sponsor(uuid) to service_role;
grant execute on function public.pm_apply_weekly_finance(uuid, integer) to service_role;
grant execute on function public.pm_advance_time(uuid, integer) to service_role;
grant execute on function public.pm_simulate_league_round(uuid) to service_role;

revoke insert, update, delete on public.pm_finance_state from anon, authenticated;
