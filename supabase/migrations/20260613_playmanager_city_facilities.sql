-- PlayManager city facilities and action loop

create table if not exists public.pm_facilities (
  team_id uuid not null references public.pm_teams(id) on delete cascade,
  sprite_key text not null check (sprite_key in ('arena','market','academy','training','finance','league','media')),
  level smallint not null default 1 check (level between 1 and 10),
  progress smallint not null default 0 check (progress between 0 and 100),
  status text not null default 'active' check (status in ('active','attention','upgradeable','locked','completed')),
  updated_at timestamptz not null default now(),
  primary key (team_id, sprite_key)
);

alter table public.pm_facilities enable row level security;

drop policy if exists "pm_facilities_owner_select" on public.pm_facilities;
create policy "pm_facilities_owner_select"
on public.pm_facilities
for select
using (
  team_id in (select id from public.pm_teams where user_id = auth.uid())
);

create index if not exists pm_facilities_team_idx
  on public.pm_facilities(team_id);

create or replace function public.pm_ensure_facilities(
  p_team_id uuid
) returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  insert into public.pm_facilities (team_id, sprite_key, level, progress, status)
  values
    (p_team_id, 'arena', 2, 68, 'active'),
    (p_team_id, 'market', 1, 34, 'attention'),
    (p_team_id, 'academy', 1, 72, 'upgradeable'),
    (p_team_id, 'training', 2, 58, 'active'),
    (p_team_id, 'finance', 1, 46, 'attention'),
    (p_team_id, 'league', 1, 80, 'active'),
    (p_team_id, 'media', 1, 18, 'locked')
  on conflict (team_id, sprite_key) do nothing;
end;
$$;

create or replace function public.pm_facility_upgrade_cost(
  p_sprite_key text,
  p_level smallint
) returns bigint language plpgsql immutable
set search_path = public, pg_temp as $$
declare
  v_base bigint;
begin
  v_base := case p_sprite_key
    when 'arena' then 620000
    when 'market' then 420000
    when 'academy' then 380000
    when 'training' then 510000
    when 'finance' then 300000
    when 'league' then 260000
    when 'media' then 220000
    else 300000
  end;

  return round(v_base * power(1.42, greatest(1, p_level)::numeric - 1))::bigint;
end;
$$;

create or replace function public.pm_run_city_action(
  p_team_id uuid,
  p_sprite_key text,
  p_action text
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_facility public.pm_facilities%rowtype;
  v_gain smallint := 0;
  v_reward bigint := 0;
  v_cost bigint := 0;
  v_new_status text;
begin
  if p_sprite_key not in ('arena','market','academy','training','finance','league','media') then
    raise exception 'invalid_facility';
  end if;

  perform public.pm_ensure_facilities(p_team_id);

  select * into v_facility
  from public.pm_facilities
  where team_id = p_team_id and sprite_key = p_sprite_key
  for update;

  if v_facility.status = 'locked' and p_action != 'facility_upgrade' then
    raise exception 'facility_locked';
  end if;

  if p_action = 'facility_upgrade' then
    v_cost := public.pm_facility_upgrade_cost(p_sprite_key, v_facility.level);
    perform public.pm_debit(p_team_id, v_cost, 'facility_upgrade:' || p_sprite_key);

    update public.pm_facilities
    set
      level = least(10, level + 1),
      progress = 0,
      status = 'active',
      updated_at = now()
    where team_id = p_team_id and sprite_key = p_sprite_key
    returning * into v_facility;
  else
    v_gain := case p_action
      when 'arena_matchday' then 18
      when 'market_scout' then 14
      when 'academy_sign' then 16
      when 'training_session' then 12
      when 'finance_sponsor' then 20
      when 'league_sim' then 15
      when 'media_campaign' then 22
      else 0
    end;

    v_reward := case p_action
      when 'arena_matchday' then 180000 + v_facility.level * 60000
      when 'finance_sponsor' then 120000 + v_facility.level * 80000
      when 'league_sim' then 70000 + v_facility.level * 20000
      when 'media_campaign' then 35000 + v_facility.level * 15000
      else 0
    end;

    v_new_status := case
      when least(100, v_facility.progress + v_gain) >= 100 then 'completed'
      when least(100, v_facility.progress + v_gain) >= 70 then 'upgradeable'
      else 'active'
    end;

    if v_reward > 0 then
      perform public.pm_credit(p_team_id, v_reward, p_action);
    end if;

    update public.pm_facilities
    set
      progress = least(100, progress + v_gain),
      status = v_new_status,
      updated_at = now()
    where team_id = p_team_id and sprite_key = p_sprite_key
    returning * into v_facility;
  end if;

  return jsonb_build_object(
    'spriteKey', v_facility.sprite_key,
    'level', v_facility.level,
    'progress', v_facility.progress,
    'status', v_facility.status,
    'reward', v_reward,
    'cost', v_cost
  );
end;
$$;

grant execute on function public.pm_ensure_facilities(uuid) to service_role;
grant execute on function public.pm_facility_upgrade_cost(text, smallint) to service_role, authenticated;
grant execute on function public.pm_run_city_action(uuid, text, text) to service_role;

revoke insert, update, delete on public.pm_facilities from anon, authenticated;

create table if not exists public.pm_season_rows (
  team_id uuid not null references public.pm_teams(id) on delete cascade,
  club_name text not null,
  played smallint not null default 0 check (played >= 0),
  won smallint not null default 0 check (won >= 0),
  drawn smallint not null default 0 check (drawn >= 0),
  lost smallint not null default 0 check (lost >= 0),
  goals_for smallint not null default 0 check (goals_for >= 0),
  goals_against smallint not null default 0 check (goals_against >= 0),
  points smallint not null default 0 check (points >= 0),
  form_percent smallint not null default 100 check (form_percent between 0 and 100),
  row_order smallint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (team_id, club_name)
);

alter table public.pm_season_rows enable row level security;

drop policy if exists "pm_season_rows_owner_select" on public.pm_season_rows;
create policy "pm_season_rows_owner_select"
on public.pm_season_rows
for select
using (
  team_id in (select id from public.pm_teams where user_id = auth.uid())
);

create or replace function public.pm_ensure_season_rows(
  p_team_id uuid
) returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_team_name text;
begin
  select name into v_team_name from public.pm_teams where id = p_team_id;
  if v_team_name is null then
    raise exception 'team_not_found';
  end if;

  insert into public.pm_season_rows (
    team_id, club_name, played, won, drawn, lost, goals_for, goals_against, points, form_percent, row_order
  ) values
    (p_team_id, v_team_name, 0, 0, 0, 0, 0, 0, 0, 100, 1),
    (p_team_id, 'North London', 0, 0, 0, 0, 0, 0, 0, 92, 2),
    (p_team_id, 'Royal Madrid', 0, 0, 0, 0, 0, 0, 0, 88, 3),
    (p_team_id, 'Milano Black', 0, 0, 0, 0, 0, 0, 0, 81, 4)
  on conflict (team_id, club_name) do nothing;
end;
$$;

create table if not exists public.pm_match_history (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.pm_teams(id) on delete cascade,
  round_no smallint not null check (round_no > 0),
  opponent_name text not null,
  venue text not null default 'Home' check (venue in ('Home', 'Away')),
  scored smallint not null default 0 check (scored >= 0),
  conceded smallint not null default 0 check (conceded >= 0),
  result text not null check (result in ('W', 'D', 'L')),
  attendance integer not null default 0 check (attendance >= 0),
  income bigint not null default 0,
  fan_mood smallint not null default 70 check (fan_mood between 0 and 100),
  created_at timestamptz not null default now(),
  unique (team_id, round_no)
);

alter table public.pm_match_history enable row level security;

drop policy if exists "pm_match_history_owner_select" on public.pm_match_history;
create policy "pm_match_history_owner_select"
on public.pm_match_history
for select
using (
  team_id in (select id from public.pm_teams where user_id = auth.uid())
);

create index if not exists pm_match_history_team_created_idx
  on public.pm_match_history(team_id, created_at desc);

create or replace function public.pm_simulate_league_round(
  p_team_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
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
begin
  perform public.pm_ensure_season_rows(p_team_id);
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
  v_income := 180000
    + (v_attendance * 8)
    + (case when v_result = 'W' then 70000 when v_result = 'D' then 30000 else 0 end);
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

  return jsonb_build_object(
    'round', v_round_no,
    'opponent', v_opponent_name,
    'score', format('%s %s - %s %s', v_team_name, v_home_goals, v_away_goals, v_opponent_name),
    'result', v_result,
    'attendance', v_attendance,
    'income', v_income,
    'formPercent', (select form_percent from public.pm_season_rows where team_id = p_team_id and club_name = v_team_name)
  );
end;
$$;

create or replace function public.pm_buy_market_player(
  p_team_id uuid,
  p_player jsonb
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player_id uuid;
  v_owner_id uuid;
  v_price bigint;
  v_position text;
begin
  v_price := coalesce((p_player->>'current_transfer_value_gel')::bigint, 0);
  v_position := coalesce(p_player->>'position', 'CM');

  if v_price <= 0 then raise exception 'invalid_price'; end if;
  if v_position not in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') then
    raise exception 'invalid_position';
  end if;

  insert into public.pm_players (
    normalized_name,
    display_name,
    is_real,
    talent,
    ea_fc_ovr,
    ovr_source,
    ovr_base,
    ovr_current,
    age,
    base_transfer_value_gel,
    current_transfer_value_gel
  ) values (
    p_player->>'normalized_name',
    p_player->>'display_name',
    coalesce((p_player->>'is_real')::boolean, true),
    coalesce((p_player->>'talent')::smallint, 8),
    nullif(p_player->>'ea_fc_ovr', '')::smallint,
    coalesce(p_player->>'ovr_source', 'ea_fc'),
    (p_player->>'ovr_base')::smallint,
    (p_player->>'ovr_current')::smallint,
    (p_player->>'age')::smallint,
    v_price,
    v_price
  )
  on conflict (normalized_name) do update
    set display_name = excluded.display_name
  returning id, owner_id into v_player_id, v_owner_id;

  if v_owner_id = p_team_id then
    raise exception 'player_owned';
  end if;

  if v_owner_id is not null and v_owner_id != p_team_id then
    raise exception 'player_unavailable';
  end if;

  perform public.pm_debit(p_team_id, v_price, 'transfer_buy:' || (p_player->>'normalized_name'));

  update public.pm_players
  set owner_id = p_team_id
  where id = v_player_id;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_position)
  on conflict (player_id) do nothing;

  return jsonb_build_object('playerId', v_player_id, 'cost', v_price);
end;
$$;

create or replace function public.pm_train_player(
  p_team_id uuid,
  p_player_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
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
  if v_player.status != 'active' then raise exception 'player_unavailable'; end if;

  v_new_ovr := least(99, v_player.ovr_current + 1);

  update public.pm_players
  set
    ovr_current = v_new_ovr,
    current_transfer_value_gel = public.pm_player_current_transfer_value_gel(ovr_base, v_new_ovr),
    fatigue = least(100, fatigue + 8)
  where id = p_player_id
  returning * into v_player;

  return jsonb_build_object(
    'playerId', v_player.id,
    'ovrCurrent', v_player.ovr_current,
    'currentTransferValueGel', v_player.current_transfer_value_gel
  );
end;
$$;

create or replace function public.pm_sign_academy_player(
  p_team_id uuid,
  p_player jsonb,
  p_cost bigint
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player_id uuid;
  v_position text;
begin
  if p_cost < 0 then raise exception 'invalid_price'; end if;
  v_position := coalesce(p_player->>'position', 'CM');
  if v_position not in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') then
    raise exception 'invalid_position';
  end if;

  if p_cost > 0 then
    perform public.pm_debit(p_team_id, p_cost, 'academy_signing');
  end if;

  insert into public.pm_players (
    normalized_name,
    display_name,
    talent,
    ovr_base,
    ovr_current,
    age,
    owner_id
  ) values (
    p_player->>'normalized_name',
    p_player->>'display_name',
    (p_player->>'talent')::smallint,
    (p_player->>'ovr_base')::smallint,
    (p_player->>'ovr_base')::smallint,
    (p_player->>'age')::smallint,
    p_team_id
  )
  on conflict (normalized_name) do nothing
  returning id into v_player_id;

  if v_player_id is null then raise exception 'player_unavailable'; end if;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_position)
  on conflict (player_id) do nothing;

  return jsonb_build_object('playerId', v_player_id, 'cost', p_cost);
end;
$$;

grant execute on function public.pm_buy_market_player(uuid, jsonb) to service_role;
grant execute on function public.pm_train_player(uuid, uuid) to service_role;
grant execute on function public.pm_sign_academy_player(uuid, jsonb, bigint) to service_role;
grant execute on function public.pm_ensure_season_rows(uuid) to service_role;
grant execute on function public.pm_simulate_league_round(uuid) to service_role;

create or replace function public.pm_sell_player(
  p_team_id uuid,
  p_player_id uuid
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_player public.pm_players%rowtype;
  v_value bigint;
begin
  select * into v_player
  from public.pm_players
  where id = p_player_id and owner_id = p_team_id
  for update;

  if v_player.id is null then
    raise exception 'player_not_found';
  end if;

  v_value := v_player.current_transfer_value_gel;
  update public.pm_players
  set owner_id = null
  where id = p_player_id;

  delete from public.pm_squads
  where player_id = p_player_id and team_id = p_team_id;

  perform public.pm_credit(p_team_id, v_value, 'transfer_sell:' || v_player.normalized_name);

  return jsonb_build_object('playerId', v_player.id, 'amount', v_value);
end;
$$;

grant execute on function public.pm_sell_player(uuid, uuid) to service_role;

revoke insert, update, delete on public.pm_match_history from anon, authenticated;
