-- PlayManager transfer NEGOTIATION: layer manager↔manager haggling on top of
-- the existing fixed-price listings (pm_transfer_listings / pm_buy_listed_player).
--
-- Model
-- -----
-- A listing keeps its instant "Buy Now" asking_price. On top of that a buyer can
-- open a NEGOTIATION against the listing: a single pm_transfer_offers row whose
-- amount_gel is the live proposed figure and awaiting_team_id is whoever must
-- respond next. Counter-offers update the same row and flip awaiting_team_id, so
-- one negotiation is one row (no offer spam). Whoever is awaited may accept,
-- which atomically settles the transfer at amount_gel.
--
-- Anti-collusion (money-laundering guard)
-- ---------------------------------------
-- Two accounts must not be able to shuttle GEL by selling a star for 1₾. So:
--   * FLOOR: any SET price (list asking OR offer/counter amount) must be at least
--     50% of the player's current_transfer_value_gel. The max is never capped.
--   * PAIR CAP: at most 2 completed transfers between the same two clubs per
--     season (seller's season_no), counted from a single pm_transfer_ledger that
--     BOTH buy-now and negotiation write to.

-- ---------------------------------------------------------------------------
-- 1. Ledger — one row per completed transfer, the single source of truth for the
--    pair cap and (later) manager head-to-head / matchup memory.
-- ---------------------------------------------------------------------------
create table if not exists public.pm_transfer_ledger (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references public.pm_players(id) on delete set null,
  seller_team_id uuid not null references public.pm_teams(id) on delete cascade,
  buyer_team_id  uuid not null references public.pm_teams(id) on delete cascade,
  price          bigint not null,
  season_no      integer not null,
  via            text not null check (via in ('buy_now', 'negotiation')),
  created_at     timestamptz not null default now()
);

create index if not exists pm_transfer_ledger_pair_idx
  on public.pm_transfer_ledger(seller_team_id, buyer_team_id, season_no);
create index if not exists pm_transfer_ledger_buyer_idx
  on public.pm_transfer_ledger(buyer_team_id, created_at desc);
create index if not exists pm_transfer_ledger_seller_idx
  on public.pm_transfer_ledger(seller_team_id, created_at desc);

alter table public.pm_transfer_ledger enable row level security;

-- Participants can read their own transfer history (matchup memory reads via the
-- admin client and bypasses this).
drop policy if exists "pm_transfer_ledger_read" on public.pm_transfer_ledger;
create policy "pm_transfer_ledger_read" on public.pm_transfer_ledger
  for select using (
    seller_team_id in (select id from public.pm_teams where user_id = auth.uid())
    or buyer_team_id in (select id from public.pm_teams where user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2. Extend pm_transfer_offers into a negotiation thread.
-- ---------------------------------------------------------------------------
alter table public.pm_transfer_offers
  add column if not exists listing_id uuid references public.pm_transfer_listings(id) on delete set null,
  add column if not exists awaiting_team_id uuid references public.pm_teams(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 3. Helpers.
-- ---------------------------------------------------------------------------

-- Minimum price any transfer of this player may settle at (50% of live value).
create or replace function public.pm_transfer_floor(p_player_id uuid)
 returns bigint
 language sql
 stable
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select greatest(1, coalesce((select current_transfer_value_gel from public.pm_players where id = p_player_id), 0) / 2)::bigint;
$function$;

revoke all on function public.pm_transfer_floor(uuid) from public, anon, authenticated;

-- How many transfers the two clubs have already completed this season.
create or replace function public.pm_pair_transfers_this_season(p_a uuid, p_b uuid, p_season_no integer)
 returns integer
 language sql
 stable
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select count(*)::integer
  from public.pm_transfer_ledger
  where season_no = p_season_no
    and ((seller_team_id = p_a and buyer_team_id = p_b)
      or (seller_team_id = p_b and buyer_team_id = p_a));
$function$;

revoke all on function public.pm_pair_transfers_this_season(uuid, uuid, integer) from public, anon, authenticated;

-- Shared settlement: move money + ownership + squad, mark the listing sold, and
-- write the ledger row. Assumes the caller has locked the listing row.
create or replace function public.pm_settle_transfer(
  p_listing_id uuid,
  p_buyer_team_id uuid,
  p_price bigint,
  p_via text
) returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_listing public.pm_transfer_listings%rowtype;
  v_player  public.pm_players%rowtype;
  v_pos     text;
  v_season  integer;
  v_pair    integer;
begin
  select * into v_listing from public.pm_transfer_listings where id = p_listing_id for update;
  if v_listing.id is null or v_listing.status <> 'active' then raise exception 'listing_unavailable'; end if;
  if v_listing.seller_team_id = p_buyer_team_id then raise exception 'own_listing'; end if;

  select * into v_player from public.pm_players where id = v_listing.player_id for update;
  if v_player.id is null or v_player.owner_id <> v_listing.seller_team_id then
    update public.pm_transfer_listings set status = 'cancelled' where id = p_listing_id;
    raise exception 'listing_unavailable';
  end if;

  -- Anti-collusion: price floor + per-season pair cap (seller's season).
  if p_price < public.pm_transfer_floor(v_player.id) then raise exception 'price_below_floor'; end if;
  select season_no into v_season from public.pm_season_state where team_id = v_listing.seller_team_id;
  v_season := coalesce(v_season, 1);
  v_pair := public.pm_pair_transfers_this_season(v_listing.seller_team_id, p_buyer_team_id, v_season);
  if v_pair >= 2 then raise exception 'pair_transfer_cap'; end if;

  select position into v_pos
  from public.pm_squads
  where player_id = v_player.id and team_id = v_listing.seller_team_id
  limit 1;
  v_pos := coalesce(v_pos, nullif(v_player.primary_position, ''), 'CM');
  if v_pos not in ('GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST') then v_pos := 'CM'; end if;

  -- money first (pm_debit raises insufficient_funds and rolls back the txn)
  perform public.pm_debit(p_buyer_team_id, p_price, 'transfer_in:' || v_player.normalized_name);
  perform public.pm_credit(v_listing.seller_team_id, p_price, 'transfer_out:' || v_player.normalized_name);

  -- ownership + squad transfer
  delete from public.pm_squads where player_id = v_player.id;
  update public.pm_players set owner_id = p_buyer_team_id where id = v_player.id;
  insert into public.pm_squads (team_id, player_id, position)
    values (p_buyer_team_id, v_player.id, v_pos)
    on conflict (player_id) do nothing;

  update public.pm_transfer_listings set status = 'sold', sold_at = now() where id = p_listing_id;

  -- close any other pending negotiations on this player
  update public.pm_transfer_offers
    set status = 'rejected', awaiting_team_id = null, updated_at = now()
    where player_id = v_player.id and status = 'pending';

  insert into public.pm_transfer_ledger (player_id, seller_team_id, buyer_team_id, price, season_no, via)
    values (v_player.id, v_listing.seller_team_id, p_buyer_team_id, p_price, v_season, p_via);

  return jsonb_build_object(
    'playerId', v_player.id,
    'playerName', v_player.normalized_name,
    'price', p_price,
    'sellerTeamId', v_listing.seller_team_id,
    'buyerTeamId', p_buyer_team_id
  );
end;
$function$;

revoke all on function public.pm_settle_transfer(uuid, uuid, bigint, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Re-point Buy Now at the shared settlement (adds pair-cap + ledger).
-- ---------------------------------------------------------------------------
create or replace function public.pm_buy_listed_player(
  p_buyer_team_id uuid,
  p_listing_id uuid
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_asking bigint;
begin
  select asking_price into v_asking
  from public.pm_transfer_listings where id = p_listing_id;
  if v_asking is null then raise exception 'listing_unavailable'; end if;
  return public.pm_settle_transfer(p_listing_id, p_buyer_team_id, v_asking, 'buy_now');
end;
$$;

revoke all on function public.pm_buy_listed_player(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Enforce the floor when a player is first listed.
-- ---------------------------------------------------------------------------
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
  if p_price < public.pm_transfer_floor(p_player_id) then raise exception 'price_below_floor'; end if;
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

revoke all on function public.pm_list_player(uuid, uuid, bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Negotiation: make / respond / cancel.
-- ---------------------------------------------------------------------------

-- Buyer opens (or is blocked from duplicating) a negotiation on a listing.
create or replace function public.pm_make_transfer_offer(
  p_from_team_id uuid,
  p_listing_id uuid,
  p_amount bigint
) returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_listing public.pm_transfer_listings%rowtype;
  v_id uuid;
begin
  if p_amount <= 0 then raise exception 'invalid_price'; end if;

  select * into v_listing from public.pm_transfer_listings where id = p_listing_id;
  if v_listing.id is null or v_listing.status <> 'active' then raise exception 'listing_unavailable'; end if;
  if v_listing.seller_team_id = p_from_team_id then raise exception 'own_listing'; end if;
  if p_amount < public.pm_transfer_floor(v_listing.player_id) then raise exception 'price_below_floor'; end if;

  if exists (select 1 from public.pm_transfer_offers
             where player_id = v_listing.player_id and from_team_id = p_from_team_id and status = 'pending') then
    raise exception 'offer_exists';
  end if;

  insert into public.pm_transfer_offers
    (player_id, from_team_id, to_team_id, offer_type, amount_gel, status, listing_id, awaiting_team_id)
    values
    (v_listing.player_id, p_from_team_id, v_listing.seller_team_id, 'transfer', p_amount, 'pending', p_listing_id, v_listing.seller_team_id)
    returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function public.pm_make_transfer_offer(uuid, uuid, bigint) from public, anon, authenticated;

-- The awaited party accepts / rejects / counters. On accept the transfer settles
-- at the live amount. On counter the same row's amount is updated and the turn
-- flips to the other team. Returns a jsonb describing the outcome.
create or replace function public.pm_respond_transfer_offer(
  p_team_id uuid,
  p_offer_id uuid,
  p_action text,
  p_counter_amount bigint default null
) returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_offer public.pm_transfer_offers%rowtype;
  v_other uuid;
  v_result jsonb;
begin
  if p_action not in ('accept', 'reject', 'counter') then raise exception 'invalid_action'; end if;

  select * into v_offer from public.pm_transfer_offers where id = p_offer_id for update;
  if v_offer.id is null or v_offer.status <> 'pending' then raise exception 'offer_unavailable'; end if;
  if v_offer.awaiting_team_id is null or v_offer.awaiting_team_id <> p_team_id then raise exception 'not_your_turn'; end if;

  if p_action = 'reject' then
    update public.pm_transfer_offers
      set status = 'rejected', awaiting_team_id = null, updated_at = now()
      where id = p_offer_id;
    return jsonb_build_object('action', 'reject', 'offerId', p_offer_id);
  end if;

  if p_action = 'counter' then
    if p_counter_amount is null or p_counter_amount <= 0 then raise exception 'invalid_price'; end if;
    if p_counter_amount < public.pm_transfer_floor(v_offer.player_id) then raise exception 'price_below_floor'; end if;
    -- turn flips to whichever team did NOT just act
    v_other := case when p_team_id = v_offer.from_team_id then v_offer.to_team_id else v_offer.from_team_id end;
    update public.pm_transfer_offers
      set amount_gel = p_counter_amount, awaiting_team_id = v_other, updated_at = now()
      where id = p_offer_id;
    return jsonb_build_object('action', 'counter', 'offerId', p_offer_id, 'amount', p_counter_amount, 'awaiting', v_other);
  end if;

  -- accept: settle at the live amount. Buyer is always from_team_id.
  if v_offer.listing_id is null then raise exception 'listing_unavailable'; end if;
  v_result := public.pm_settle_transfer(v_offer.listing_id, v_offer.from_team_id, v_offer.amount_gel, 'negotiation');
  update public.pm_transfer_offers
    set status = 'accepted', awaiting_team_id = null, updated_at = now()
    where id = p_offer_id;
  return jsonb_build_object('action', 'accept', 'offerId', p_offer_id) || v_result;
end;
$function$;

revoke all on function public.pm_respond_transfer_offer(uuid, uuid, text, bigint) from public, anon, authenticated;

-- Either participant withdraws a pending negotiation.
create or replace function public.pm_cancel_transfer_offer(
  p_team_id uuid,
  p_offer_id uuid
) returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_offer public.pm_transfer_offers%rowtype;
begin
  select * into v_offer from public.pm_transfer_offers where id = p_offer_id for update;
  if v_offer.id is null or v_offer.status <> 'pending' then raise exception 'offer_unavailable'; end if;
  if p_team_id <> v_offer.from_team_id and p_team_id <> v_offer.to_team_id then raise exception 'not_participant'; end if;

  update public.pm_transfer_offers
    set status = 'cancelled', awaiting_team_id = null, updated_at = now()
    where id = p_offer_id;
end;
$function$;

revoke all on function public.pm_cancel_transfer_offer(uuid, uuid) from public, anon, authenticated;
