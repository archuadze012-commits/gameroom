alter table public.pm_players
  add column if not exists morale smallint not null default 78 check (morale between 0 and 100),
  add column if not exists injury_matches smallint not null default 0 check (injury_matches between 0 and 20);

update public.pm_players
set
  morale = coalesce(morale, 78),
  injury_matches = coalesce(injury_matches, 0)
where true;

create table if not exists public.pm_match_settings (
  team_id uuid primary key references public.pm_teams(id) on delete cascade,
  tactical_style text not null default 'balanced' check (tactical_style in ('balanced','pressing','possession','counter')),
  defensive_line text not null default 'mid' check (defensive_line in ('low','mid','high')),
  tempo text not null default 'balanced' check (tempo in ('controlled','balanced','direct')),
  focus_side text not null default 'center' check (focus_side in ('left','center','right')),
  updated_at timestamptz not null default now()
);

alter table public.pm_match_settings enable row level security;

drop policy if exists "pm_match_settings_owner_select" on public.pm_match_settings;
create policy "pm_match_settings_owner_select"
on public.pm_match_settings
for select
using (
  team_id in (select id from public.pm_teams where user_id = auth.uid())
);

create or replace function public.pm_ensure_match_settings(
  p_team_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.pm_match_settings (team_id)
  values (p_team_id)
  on conflict (team_id) do nothing;
end;
$$;

create or replace function public.pm_save_match_settings(
  p_team_id uuid,
  p_tactical_style text,
  p_defensive_line text,
  p_tempo text,
  p_focus_side text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings public.pm_match_settings%rowtype;
begin
  perform public.pm_ensure_match_settings(p_team_id);

  update public.pm_match_settings
  set
    tactical_style = p_tactical_style,
    defensive_line = p_defensive_line,
    tempo = p_tempo,
    focus_side = p_focus_side,
    updated_at = now()
  where team_id = p_team_id
  returning * into v_settings;

  return jsonb_build_object(
    'tacticalStyle', v_settings.tactical_style,
    'defensiveLine', v_settings.defensive_line,
    'tempo', v_settings.tempo,
    'focusSide', v_settings.focus_side
  );
end;
$$;

create or replace function public.pm_train_player(
  p_team_id uuid,
  p_player_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player public.pm_players%rowtype;
  v_new_ovr smallint;
begin
  select p.* into v_player
  from public.pm_players p
  join public.pm_squads s on s.player_id = p.id
  where p.id = p_player_id and s.team_id = p_team_id
  for update;

  if v_player.id is null then raise exception 'player_not_found'; end if;
  if v_player.status != 'active' or coalesce(v_player.injury_matches, 0) > 0 then raise exception 'player_unavailable'; end if;

  v_new_ovr := least(99, v_player.ovr_current + 1);

  update public.pm_players
  set
    ovr_current = v_new_ovr,
    current_transfer_value_gel = public.pm_player_current_transfer_value_gel(ovr_base, v_new_ovr),
    fatigue = least(100, fatigue + 8),
    morale = least(100, morale + 3)
  where id = p_player_id
  returning * into v_player;

  return jsonb_build_object(
    'playerId', v_player.id,
    'ovrCurrent', v_player.ovr_current,
    'currentTransferValueGel', v_player.current_transfer_value_gel,
    'fatigue', v_player.fatigue,
    'morale', v_player.morale
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
begin
  perform public.pm_ensure_season_rows(p_team_id);
  perform public.pm_ensure_match_settings(p_team_id);
  select * into v_state from public.pm_season_state where team_id = p_team_id;
  select * into v_settings from public.pm_match_settings where team_id = p_team_id;

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

  v_attack_bonus := 0;
  v_defense_bonus := 0;
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

  v_attendance := 34000 + floor(random() * 8000)::integer + (coalesce(v_team_form, 70) * 42) + (v_match_readiness * 20);
  v_income := 170000 + (v_attendance * 8) + (case when v_result = 'W' then 70000 when v_result = 'D' then 30000 else 0 end);
  v_fan_mood := least(100, greatest(38, round((coalesce(v_team_form, 70) * 0.55) + (v_avg_morale * 0.2) + case when v_result = 'W' then 12 when v_result = 'D' then 3 else -9 end)::numeric));

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
    'injuryUpdate', case when v_injured_player_name is not null then jsonb_build_object('playerName', v_injured_player_name, 'matches', v_injury_games) else null end,
    'recoveredCount', v_recovered_count
  );
end;
$$;

grant execute on function public.pm_ensure_match_settings(uuid) to service_role;
grant execute on function public.pm_save_match_settings(uuid, text, text, text, text) to service_role;
grant execute on function public.pm_train_player(uuid, uuid) to service_role;
grant execute on function public.pm_simulate_league_round(uuid) to service_role;

revoke insert, update, delete on public.pm_match_settings from anon, authenticated;
