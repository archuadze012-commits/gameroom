-- PlayManager: manager-to-manager transfer listings.
--
-- The transfer market now shows ONLY players a manager has put up for sale at an
-- asking price (distinct from pm_transfer_offers, which are team→team bids). A
-- listed player stays owned + in the seller's squad until bought; on purchase,
-- the buyer pays the asking price, the seller receives it in full, and ownership
-- moves to the buyer.

create table if not exists public.pm_transfer_listings (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references public.pm_players(id) on delete cascade,
  seller_team_id uuid not null references public.pm_teams(id) on delete cascade,
  asking_price   bigint not null check (asking_price > 0),
  status         text not null default 'active' check (status in ('active','sold','cancelled')),
  created_at     timestamptz not null default now(),
  sold_at        timestamptz
);

-- one active listing per player
create unique index if not exists pm_transfer_listings_active_uniq
  on public.pm_transfer_listings(player_id) where status = 'active';
create index if not exists pm_transfer_listings_status_idx
  on public.pm_transfer_listings(status, created_at desc);
create index if not exists pm_transfer_listings_seller_idx
  on public.pm_transfer_listings(seller_team_id);

alter table public.pm_transfer_listings enable row level security;

-- Everyone can read active listings; a seller can also read their own (any status).
create policy "pm_transfer_listings_read" on public.pm_transfer_listings
  for select using (
    status = 'active'
    or seller_team_id in (select id from public.pm_teams where user_id = auth.uid())
  );

-- List an owned player for sale.
create or replace function public.pm_list_player(
  p_team_id uuid,
  p_player_id uuid,
  p_price bigint
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner  uuid;
  v_status text;
  v_id     uuid;
begin
  if p_price <= 0 then raise exception 'invalid_price'; end if;

  select owner_id, status into v_owner, v_status
  from public.pm_players where id = p_player_id for update;

  if v_owner is null or v_owner <> p_team_id then raise exception 'not_owner'; end if;
  if v_status <> 'active' then raise exception 'player_unavailable'; end if;
  if exists (select 1 from public.pm_transfer_listings
             where player_id = p_player_id and status = 'active') then
    raise exception 'already_listed';
  end if;

  insert into public.pm_transfer_listings (player_id, seller_team_id, asking_price)
    values (p_player_id, p_team_id, p_price)
    returning id into v_id;
  return v_id;
end;
$$;

-- Cancel a seller's own active listing.
create or replace function public.pm_unlist_player(
  p_team_id uuid,
  p_listing_id uuid
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_seller uuid;
  v_status text;
begin
  select seller_team_id, status into v_seller, v_status
  from public.pm_transfer_listings where id = p_listing_id for update;

  if v_seller is null or v_seller <> p_team_id then raise exception 'not_seller'; end if;
  if v_status <> 'active' then raise exception 'not_active'; end if;

  update public.pm_transfer_listings set status = 'cancelled' where id = p_listing_id;
end;
$$;

-- Buy a listed player: buyer pays asking price, seller receives it, ownership moves.
create or replace function public.pm_buy_listed_player(
  p_buyer_team_id uuid,
  p_listing_id uuid
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_listing public.pm_transfer_listings%rowtype;
  v_player  public.pm_players%rowtype;
  v_pos     text;
begin
  select * into v_listing from public.pm_transfer_listings where id = p_listing_id for update;
  if v_listing.id is null or v_listing.status <> 'active' then raise exception 'listing_unavailable'; end if;
  if v_listing.seller_team_id = p_buyer_team_id then raise exception 'own_listing'; end if;

  select * into v_player from public.pm_players where id = v_listing.player_id for update;
  if v_player.id is null or v_player.owner_id <> v_listing.seller_team_id then
    update public.pm_transfer_listings set status = 'cancelled' where id = p_listing_id;
    raise exception 'listing_unavailable';
  end if;

  select position into v_pos
  from public.pm_squads
  where player_id = v_player.id and team_id = v_listing.seller_team_id
  limit 1;
  v_pos := coalesce(v_pos, nullif(v_player.primary_position, ''), 'CM');
  if v_pos not in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') then v_pos := 'CM'; end if;

  -- money first (pm_debit raises insufficient_funds and rolls back the txn)
  perform public.pm_debit(p_buyer_team_id, v_listing.asking_price, 'transfer_in:' || v_player.normalized_name);
  perform public.pm_credit(v_listing.seller_team_id, v_listing.asking_price, 'transfer_out:' || v_player.normalized_name);

  -- ownership + squad transfer
  delete from public.pm_squads where player_id = v_player.id;
  update public.pm_players set owner_id = p_buyer_team_id where id = v_player.id;
  insert into public.pm_squads (team_id, player_id, position)
    values (p_buyer_team_id, v_player.id, v_pos)
    on conflict (player_id) do nothing;

  update public.pm_transfer_listings set status = 'sold', sold_at = now() where id = p_listing_id;

  return jsonb_build_object(
    'playerId', v_player.id,
    'price', v_listing.asking_price,
    'sellerTeamId', v_listing.seller_team_id
  );
end;
$$;

grant execute on function public.pm_list_player(uuid, uuid, bigint) to authenticated, service_role;
grant execute on function public.pm_unlist_player(uuid, uuid) to authenticated, service_role;
grant execute on function public.pm_buy_listed_player(uuid, uuid) to authenticated, service_role;
