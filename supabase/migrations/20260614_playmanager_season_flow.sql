create table if not exists public.pm_season_state (
  team_id uuid primary key references public.pm_teams(id) on delete cascade,
  season_no integer not null default 1 check (season_no > 0),
  is_completed boolean not null default false,
  last_finish smallint check (last_finish between 1 and 20),
  last_reward bigint not null default 0,
  last_outcome text check (last_outcome in ('promoted', 'relegated', 'stayed')),
  updated_at timestamptz not null default now()
);

alter table public.pm_season_state enable row level security;

drop policy if exists "pm_season_state_owner_select" on public.pm_season_state;
create policy "pm_season_state_owner_select"
on public.pm_season_state
for select
using (
  team_id in (select id from public.pm_teams where user_id = auth.uid())
);

create or replace function public.pm_ensure_season_state(
  p_team_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.pm_season_state (team_id)
  values (p_team_id)
  on conflict (team_id) do nothing;
end;
$$;

create or replace function public.pm_reset_season_rows(
  p_team_id uuid,
  p_season_no integer
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_name text;
begin
  select name into v_team_name from public.pm_teams where id = p_team_id;
  if v_team_name is null then
    raise exception 'team_not_found';
  end if;

  delete from public.pm_match_history where team_id = p_team_id;
  delete from public.pm_season_rows where team_id = p_team_id;

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
$$;

create or replace function public.pm_finalize_season(
  p_team_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rank smallint;
  v_points smallint;
  v_reward bigint := 0;
  v_outcome text := 'stayed';
  v_current_division integer;
  v_next_division integer;
  v_completed boolean;
begin
  perform public.pm_ensure_season_state(p_team_id);

  select is_completed into v_completed
  from public.pm_season_state
  where team_id = p_team_id;

  if coalesce(v_completed, false) then
    return (
      select jsonb_build_object(
        'completed', true,
        'rank', last_finish,
        'reward', last_reward,
        'outcome', last_outcome
      )
      from public.pm_season_state
      where team_id = p_team_id
    );
  end if;

  with ranked as (
    select
      club_name,
      points,
      row_number() over (
        order by points desc, (goals_for - goals_against) desc, goals_for desc, club_name asc
      ) as rank_no
    from public.pm_season_rows
    where team_id = p_team_id
  )
  select rank_no, points
  into v_rank, v_points
  from ranked
  where club_name = (select name from public.pm_teams where id = p_team_id);

  select division_id into v_current_division
  from public.pm_teams
  where id = p_team_id
  for update;

  v_reward := case v_rank
    when 1 then 650000
    when 2 then 420000
    when 3 then 180000
    else 90000
  end;

  v_next_division := v_current_division;
  if v_rank = 1 and v_current_division > 1 then
    v_next_division := v_current_division - 1;
    v_outcome := 'promoted';
  elsif v_rank = 4 and v_current_division < 3 then
    v_next_division := v_current_division + 1;
    v_outcome := 'relegated';
  end if;

  if v_reward > 0 then
    perform public.pm_credit(p_team_id, v_reward, 'season_reward');
  end if;

  update public.pm_teams
  set division_id = v_next_division
  where id = p_team_id;

  update public.pm_season_state
  set
    is_completed = true,
    last_finish = v_rank,
    last_reward = v_reward,
    last_outcome = v_outcome,
    updated_at = now()
  where team_id = p_team_id;

  return jsonb_build_object(
    'completed', true,
    'rank', v_rank,
    'points', v_points,
    'reward', v_reward,
    'outcome', v_outcome,
    'division', v_next_division
  );
end;
$$;

create or replace function public.pm_ensure_season_rows(
  p_team_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows integer;
begin
  perform public.pm_ensure_season_state(p_team_id);

  select count(*) into v_rows
  from public.pm_season_rows
  where team_id = p_team_id;

  if v_rows = 0 then
    perform public.pm_reset_season_rows(
      p_team_id,
      coalesce((select season_no from public.pm_season_state where team_id = p_team_id), 1)
    );
  end if;
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
begin
  perform public.pm_ensure_season_rows(p_team_id);
  select * into v_state from public.pm_season_state where team_id = p_team_id;

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

  select club_name
  into v_opponent_name
  from public.pm_season_rows
  where team_id = p_team_id and club_name != v_team_name
  order by row_order
  offset (coalesce(v_round_no, 0) % 3)
  limit 1;

  v_round_no := coalesce(v_round_no, 0) + 1;
  v_home_goals := least(5, floor(random() * 3 + case when coalesce(v_team_form, 70) >= 85 then 1 else 0 end)::smallint);
  v_away_goals := least(4, floor(random() * 3 + case when coalesce(v_team_form, 70) <= 55 then 1 else 0 end)::smallint);
  v_result := case
    when v_home_goals > v_away_goals then 'W'
    when v_home_goals = v_away_goals then 'D'
    else 'L'
  end;
  v_attendance := 36000 + floor(random() * 9000)::integer + (coalesce(v_team_form, 70) * 45);
  v_income := 180000 + (v_attendance * 8) + (case when v_result = 'W' then 70000 when v_result = 'D' then 30000 else 0 end);
  v_fan_mood := least(100, greatest(42, coalesce(v_team_form, 70) + case when v_result = 'W' then 8 when v_result = 'D' then 2 else -7 end));

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
    'seasonSummary', v_summary
  );
end;
$$;

grant execute on function public.pm_ensure_season_state(uuid) to service_role;
grant execute on function public.pm_reset_season_rows(uuid, integer) to service_role;
grant execute on function public.pm_finalize_season(uuid) to service_role;
grant execute on function public.pm_ensure_season_rows(uuid) to service_role;
grant execute on function public.pm_simulate_league_round(uuid) to service_role;

revoke insert, update, delete on public.pm_season_state from anon, authenticated;
