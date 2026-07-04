import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed HAPPY-PATH integration test for accepting a transfer offer. Runs the
// real closure — pm_respond_transfer_offer -> pm_settle_transfer -> pm_debit /
// pm_credit / pm_transfer_floor / pm_pair_transfers_this_season — end to end and
// asserts every side effect: money moved, ownership + squad transferred, listing
// sold, offer accepted, ledger written. Also covers the turn guard and the
// money-first rollback on insufficient funds.

let db: PGlite;

const SELLER = 'aaaaaaaa-0000-0000-0000-000000000001';
const BUYER = 'bbbbbbbb-0000-0000-0000-000000000002';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_wallets (team_id uuid primary key, balance bigint not null default 0);
    create table public.pm_transactions (
      id uuid primary key default gen_random_uuid(),
      team_id uuid, amount bigint, reason text, created_at timestamptz default now()
    );
    create table public.pm_players (
      id uuid primary key default gen_random_uuid(),
      owner_id uuid,
      normalized_name text,
      primary_position text,
      current_transfer_value_gel bigint default 0
    );
    create table public.pm_squads (
      team_id uuid,
      player_id uuid unique,
      position text
    );
    create table public.pm_season_state (team_id uuid primary key, season_no integer default 1);
    create table public.pm_transfer_listings (
      id uuid primary key default gen_random_uuid(),
      seller_team_id uuid, player_id uuid, status text default 'active', sold_at timestamptz
    );
    create table public.pm_transfer_offers (
      id uuid primary key default gen_random_uuid(),
      from_team_id uuid, to_team_id uuid, awaiting_team_id uuid,
      player_id uuid, listing_id uuid, amount_gel bigint,
      status text default 'pending', updated_at timestamptz default now()
    );
    create table public.pm_transfer_ledger (
      id uuid primary key default gen_random_uuid(),
      player_id uuid, seller_team_id uuid, buyer_team_id uuid,
      price bigint, season_no integer, via text, created_at timestamptz default now()
    );
  `);
  // Tables must exist before the SQL-language helpers (they validate table refs
  // at creation); plpgsql functions resolve callees at runtime, so order is free.
  for (const fn of [
    'pm_credit',
    'pm_debit',
    'pm_transfer_floor',
    'pm_pair_transfers_this_season',
    'pm_settle_transfer',
    'pm_respond_transfer_offer',
  ]) {
    await loadRpc(db, fn);
  }
});

after(async () => {
  await db?.close();
});

// Seed one buyer↔seller negotiation over a listed player. Returns the offer id.
async function seedOffer(opts: { buyerBalance: number; value: number; amount: number }) {
  await db.exec(`truncate pm_wallets, pm_transactions, pm_players, pm_squads,
    pm_season_state, pm_transfer_listings, pm_transfer_offers, pm_transfer_ledger;`);
  await db.query(`insert into pm_wallets (team_id, balance) values ($1,$2),($3,0)`, [
    BUYER, opts.buyerBalance.toString(), SELLER,
  ]);
  await db.query(`insert into pm_season_state (team_id, season_no) values ($1,1)`, [SELLER]);
  const { rows: pr } = await db.query<{ id: string }>(
    `insert into pm_players (owner_id, normalized_name, primary_position, current_transfer_value_gel)
     values ($1,'striker','ST',$2) returning id`,
    [SELLER, opts.value.toString()],
  );
  const playerId = pr[0].id;
  await db.query(`insert into pm_squads (team_id, player_id, position) values ($1,$2,'ST')`, [SELLER, playerId]);
  const { rows: lr } = await db.query<{ id: string }>(
    `insert into pm_transfer_listings (seller_team_id, player_id, status) values ($1,$2,'active') returning id`,
    [SELLER, playerId],
  );
  const listingId = lr[0].id;
  // Buyer opened the offer; it's the seller's turn to accept.
  const { rows: or } = await db.query<{ id: string }>(
    `insert into pm_transfer_offers (from_team_id, to_team_id, awaiting_team_id, player_id, listing_id, amount_gel, status)
     values ($1,$2,$2,$3,$4,$5,'pending') returning id`,
    [BUYER, SELLER, playerId, listingId, opts.amount.toString()],
  );
  return { offerId: or[0].id, playerId, listingId };
}

test('accepting an offer settles the whole transfer', async () => {
  const { offerId, playerId, listingId } = await seedOffer({
    buyerBalance: 5000,
    value: 1000,
    amount: 900,
  });

  const res = await db.query<{ pm_respond_transfer_offer: { action: string; buyerTeamId: string } }>(
    `select public.pm_respond_transfer_offer($1,$2,'accept') as pm_respond_transfer_offer`,
    [SELLER, offerId],
  );
  assert.equal(res.rows[0].pm_respond_transfer_offer.action, 'accept');

  const one = async <T>(sql: string, p: unknown[]) => (await db.query<T>(sql, p)).rows[0];

  // Ownership + squad moved to the buyer.
  const player = await one<{ owner_id: string }>(`select owner_id from pm_players where id=$1`, [playerId]);
  assert.equal(player.owner_id, BUYER);
  const squad = await one<{ team_id: string }>(`select team_id from pm_squads where player_id=$1`, [playerId]);
  assert.equal(squad.team_id, BUYER);

  // Money moved: buyer −900, seller +900.
  const buyer = await one<{ balance: string }>(`select balance from pm_wallets where team_id=$1`, [BUYER]);
  const seller = await one<{ balance: string }>(`select balance from pm_wallets where team_id=$1`, [SELLER]);
  assert.equal(Number(buyer.balance), 4100);
  assert.equal(Number(seller.balance), 900);

  // Listing sold, offer accepted, ledger written once.
  const listing = await one<{ status: string }>(`select status from pm_transfer_listings where id=$1`, [listingId]);
  assert.equal(listing.status, 'sold');
  const offer = await one<{ status: string }>(`select status from pm_transfer_offers where id=$1`, [offerId]);
  assert.equal(offer.status, 'accepted');
  const ledger = await one<{ c: string }>(`select count(*)::int as c from pm_transfer_ledger where player_id=$1`, [playerId]);
  assert.equal(Number(ledger.c), 1);
});

test('only the awaited party can accept (not_your_turn)', async () => {
  const { offerId } = await seedOffer({ buyerBalance: 5000, value: 1000, amount: 900 });
  // Buyer is not awaited (it's the seller's turn) — buyer cannot self-accept.
  await assert.rejects(
    () => db.query(`select public.pm_respond_transfer_offer($1,$2,'accept')`, [BUYER, offerId]),
    /not_your_turn/,
  );
});

test('accept rolls back entirely when the buyer cannot afford it', async () => {
  const { offerId, playerId } = await seedOffer({ buyerBalance: 100, value: 1000, amount: 900 });
  await assert.rejects(
    () => db.query(`select public.pm_respond_transfer_offer($1,$2,'accept')`, [SELLER, offerId]),
    /insufficient_funds/,
  );
  // Nothing moved — player still owned by the seller, offer still pending.
  const { rows } = await db.query<{ owner_id: string }>(`select owner_id from pm_players where id=$1`, [playerId]);
  assert.equal(rows[0].owner_id, SELLER);
  const { rows: o } = await db.query<{ status: string }>(`select status from pm_transfer_offers where id=$1`, [offerId]);
  assert.equal(o[0].status, 'pending');
});
