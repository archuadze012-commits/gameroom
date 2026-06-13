-- PlayManager Phase 1: RPC Functions

-- pm_credit: add PM₾ to team wallet (atomic)
create or replace function public.pm_credit(
  p_team_id uuid,
  p_amount   bigint,
  p_reason   text
) returns void language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  insert into pm_wallets (team_id, balance) values (p_team_id, p_amount)
    on conflict (team_id) do update set balance = pm_wallets.balance + p_amount;
  insert into pm_transactions (team_id, amount, reason) values (p_team_id, p_amount, p_reason);
end;
$$;

-- pm_debit: subtract PM₾ (raises if insufficient)
create or replace function public.pm_debit(
  p_team_id uuid,
  p_amount   bigint,
  p_reason   text
) returns void language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_balance bigint;
begin
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  select balance into v_balance from pm_wallets where team_id = p_team_id for update;
  if v_balance is null or v_balance < p_amount then
    raise exception 'insufficient_funds';
  end if;
  update pm_wallets set balance = balance - p_amount where team_id = p_team_id;
  insert into pm_transactions (team_id, amount, reason) values (p_team_id, -p_amount, p_reason);
end;
$$;

-- pm_create_team: create team + wallet + award starter pack in one transaction
create or replace function public.pm_create_team(
  p_user_id   uuid,
  p_team_name text,
  p_players   jsonb  -- [{normalized_name, display_name, talent, ovr_base, age, position}]
) returns uuid language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_team_id    uuid;
  v_player     jsonb;
  v_player_id  uuid;
  v_pack_id    int;
  v_player_ids uuid[] := '{}';
begin
  if auth.uid() != p_user_id then raise exception 'forbidden'; end if;
  if exists (select 1 from pm_teams where user_id = p_user_id) then
    raise exception 'team_exists';
  end if;

  insert into pm_teams (user_id, name) values (p_user_id, p_team_name)
    returning id into v_team_id;

  -- Welcome wallet: 1000 PM₾
  insert into pm_wallets (team_id, balance) values (v_team_id, 1000);
  insert into pm_transactions (team_id, amount, reason)
    values (v_team_id, 1000, 'სტარტერ ბონუსი');

  -- Insert players generated server-side
  for v_player in select * from jsonb_array_elements(p_players) loop
    v_player_id := null;
    insert into pm_players (
      normalized_name, display_name, talent, ovr_base, ovr_current, age
    ) values (
      v_player->>'normalized_name',
      v_player->>'display_name',
      (v_player->>'talent')::smallint,
      (v_player->>'ovr_base')::smallint,
      (v_player->>'ovr_base')::smallint,
      (v_player->>'age')::smallint
    )
    on conflict (normalized_name) do nothing
    returning id into v_player_id;

    if v_player_id is not null then
      update pm_players set owner_id = v_team_id where id = v_player_id;
      insert into pm_squads (team_id, player_id, position)
        values (v_team_id, v_player_id, v_player->>'position')
        on conflict do nothing;
      v_player_ids := v_player_ids || v_player_id;
    end if;
  end loop;

  -- Log starter pack opening
  select id into v_pack_id from pm_packs where cost_pm = 0 limit 1;
  insert into pm_pack_openings (team_id, pack_id, players_received)
    values (v_team_id, v_pack_id, v_player_ids);

  return v_team_id;
end;
$$;

-- Grant execute
grant execute on function public.pm_credit     to service_role;
grant execute on function public.pm_debit      to service_role;
grant execute on function public.pm_create_team to authenticated;

-- Revoke direct table writes — all mutations go through RPCs
revoke insert, update, delete on pm_teams, pm_wallets, pm_transactions,
       pm_players, pm_squads, pm_pack_openings from authenticated;
