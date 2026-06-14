-- PlayManager fix #8: scope player-name uniqueness to REAL players only.
--
-- Problem: `pm_players_name_uniq unique (normalized_name)` made EVERY player name
-- globally unique — including procedurally generated squad players. The generated
-- name pool is only 90 first × 80 last = 7,200 combinations, so after ~480 teams
-- (480 × 15 players) the pool is exhausted: team creation either throws
-- `name_pool_exhausted` or silently drops colliding players. That is a hard ceiling
-- on how many teams the game can ever support.
--
-- Fix: real players (is_real = true, e.g. Mbappé) stay globally unique so the transfer
-- market keeps "one of each" scarcity. Generated players (is_real = false) may share
-- names freely — they are already identified by their uuid primary key everywhere in
-- the app, never by normalized_name. This removes the ceiling and the silent drops.
--
-- ⚠️ Requires `supabase db push` against a real database and testing of: team creation,
--    market buy/re-acquire, academy signing. Apply this AFTER 20260615.

-- 1. Swap the global unique constraint for a partial unique index over real players.
alter table public.pm_players drop constraint if exists pm_players_name_uniq;

create unique index if not exists pm_players_real_name_uniq
  on public.pm_players (normalized_name)
  where is_real = true;

-- 2. Generated-player inserts: plain insert (names may now repeat). The old
--    `on conflict (normalized_name) do nothing` no longer has a matching arbiter index
--    for is_real = false rows, so it must be removed.

-- 2a. pm_create_team — supersedes the generated insert in 20260615 (keeps 1M balance + guard).
create or replace function public.pm_create_team(
  p_user_id   uuid,
  p_team_name text,
  p_players   jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team_id     uuid;
  v_player      jsonb;
  v_player_id   uuid;
  v_pack_id     int;
  v_player_ids  uuid[] := '{}';
  v_is_real     boolean;
  v_ea_fc_ovr   smallint;
  v_ovr_base    smallint;
  v_ovr_current smallint;
  v_expected    int;
begin
  if auth.uid() != p_user_id then raise exception 'forbidden'; end if;
  if exists (select 1 from pm_teams where user_id = p_user_id) then
    raise exception 'team_exists';
  end if;

  v_expected := coalesce(jsonb_array_length(p_players), 0);

  insert into pm_teams (user_id, name) values (p_user_id, p_team_name)
    returning id into v_team_id;

  insert into pm_wallets (team_id, balance) values (v_team_id, 1000000);
  insert into pm_transactions (team_id, amount, reason)
    values (v_team_id, 1000000, 'სტარტერ ბონუსი');

  for v_player in select * from jsonb_array_elements(p_players) loop
    v_is_real := coalesce((v_player->>'is_real')::boolean, false);
    v_ea_fc_ovr := nullif(v_player->>'ea_fc_ovr', '')::smallint;
    v_ovr_base := coalesce(v_ea_fc_ovr, (v_player->>'ovr_base')::smallint);
    v_ovr_current := coalesce((v_player->>'ovr_current')::smallint, v_ovr_base);

    insert into pm_players (
      normalized_name, display_name, is_real, talent,
      ea_fc_ovr, ovr_source, ovr_base, ovr_current, age, owner_id
    ) values (
      v_player->>'normalized_name',
      v_player->>'display_name',
      v_is_real,
      (v_player->>'talent')::smallint,
      case when v_is_real then v_ovr_base else null end,
      case when v_is_real then 'ea_fc' else 'generated' end,
      v_ovr_base,
      v_ovr_current,
      (v_player->>'age')::smallint,
      v_team_id
    )
    returning id into v_player_id;

    insert into pm_squads (team_id, player_id, position)
      values (v_team_id, v_player_id, v_player->>'position')
      on conflict do nothing;
    v_player_ids := v_player_ids || v_player_id;
  end loop;

  if coalesce(array_length(v_player_ids, 1), 0) <> v_expected then
    raise exception 'squad_incomplete';
  end if;

  select id into v_pack_id from pm_packs where cost_pm = 0 limit 1;
  insert into pm_pack_openings (team_id, pack_id, players_received)
    values (v_team_id, v_pack_id, v_player_ids);

  return v_team_id;
end;
$$;

grant execute on function public.pm_create_team(uuid, text, jsonb) to authenticated;

-- 2b. pm_sign_academy_player — generated player, plain insert.
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
    normalized_name, display_name, talent, ovr_base, ovr_current, age, owner_id
  ) values (
    p_player->>'normalized_name',
    p_player->>'display_name',
    (p_player->>'talent')::smallint,
    (p_player->>'ovr_base')::smallint,
    (p_player->>'ovr_base')::smallint,
    (p_player->>'age')::smallint,
    p_team_id
  )
  returning id into v_player_id;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_position)
  on conflict (player_id) do nothing;

  return jsonb_build_object('playerId', v_player_id, 'cost', p_cost);
end;
$$;

grant execute on function public.pm_sign_academy_player(uuid, jsonb, bigint) to service_role;

-- 2c. pm_sign_academy_prospect — generated player, plain insert.
create or replace function public.pm_sign_academy_prospect(
  p_team_id uuid,
  p_prospect_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prospect public.pm_academy_prospects%rowtype;
  v_player_id uuid;
begin
  select *
  into v_prospect
  from public.pm_academy_prospects
  where id = p_prospect_id
    and team_id = p_team_id
    and status = 'active'
  for update;

  if v_prospect.id is null then
    raise exception 'player_not_found';
  end if;

  if v_prospect.signing_cost > 0 then
    perform public.pm_debit(p_team_id, v_prospect.signing_cost, 'academy_signing');
  end if;

  insert into public.pm_players (
    normalized_name, display_name, talent, ovr_base, ovr_current, age, owner_id
  ) values (
    v_prospect.normalized_name,
    v_prospect.display_name,
    v_prospect.talent,
    v_prospect.ovr_base,
    v_prospect.ovr_base,
    v_prospect.age,
    p_team_id
  )
  returning id into v_player_id;

  insert into public.pm_squads (team_id, player_id, position)
  values (p_team_id, v_player_id, v_prospect.position)
  on conflict (player_id) do nothing;

  update public.pm_academy_prospects
  set status = 'signed'
  where id = p_prospect_id;

  return jsonb_build_object(
    'playerId', v_player_id,
    'cost', v_prospect.signing_cost,
    'position', v_prospect.position
  );
end;
$$;

grant execute on function public.pm_sign_academy_prospect(uuid, uuid) to service_role;

-- 3. Real-player insert: re-acquire by name only matches the partial index predicate.
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
    normalized_name, display_name, is_real, talent, ea_fc_ovr, ovr_source,
    ovr_base, ovr_current, age, base_transfer_value_gel, current_transfer_value_gel
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
  on conflict (normalized_name) where is_real = true do update
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

grant execute on function public.pm_buy_market_player(uuid, jsonb) to service_role;
