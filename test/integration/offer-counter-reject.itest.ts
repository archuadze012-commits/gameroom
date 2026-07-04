import { strict as assert } from 'node:assert';
import { test, before, after, beforeEach } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed integration test for the reject / counter branches of
// pm_respond_transfer_offer (the accept branch is covered in offer-accept).
// Closure is small — no settlement — just the offer row, pm_transfer_floor, and
// pm_players (for the floor). Covers the turn guard, action validation, the
// counter price floor, and the awaiting-party flip.

let db: PGlite;

const BUYER = 'aaaa0000-0000-0000-0000-000000000001'; // opened the offer
const SELLER = 'bbbb0000-0000-0000-0000-000000000002'; // awaited first

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_players (id uuid primary key default gen_random_uuid(), current_transfer_value_gel bigint default 0);
    create table public.pm_transfer_offers (
      id uuid primary key default gen_random_uuid(),
      from_team_id uuid, to_team_id uuid, awaiting_team_id uuid,
      player_id uuid, amount_gel bigint, status text default 'pending',
      updated_at timestamptz default now()
    );
  `);
  await loadRpc(db, 'pm_transfer_floor');
  await loadRpc(db, 'pm_respond_transfer_offer');
});

after(async () => { await db?.close(); });

let PLAYER: string;
beforeEach(async () => {
  await db.exec(`truncate pm_players, pm_transfer_offers;`);
  // Player valued 1000 → transfer floor is 500.
  const { rows } = await db.query<{ id: string }>(
    `insert into pm_players (current_transfer_value_gel) values (1000) returning id`,
    [],
  );
  PLAYER = rows[0].id;
});

// Offer awaited by `awaiting` (defaults to the seller's turn).
async function newOffer(awaiting = SELLER, status = 'pending'): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into pm_transfer_offers (from_team_id, to_team_id, awaiting_team_id, player_id, amount_gel, status)
     values ($1, $2, $3, $4, 900, $5) returning id`,
    [BUYER, SELLER, awaiting, PLAYER, status],
  );
  return rows[0].id;
}

async function respond(team: string, offer: string, action: string, amount?: number) {
  return db.query(`select public.pm_respond_transfer_offer($1, $2, $3, $4)`, [
    team, offer, action, amount ?? null,
  ]);
}

test('the awaited party can reject; the offer closes', async () => {
  const id = await newOffer();
  await respond(SELLER, id, 'reject');
  const { rows } = await db.query<{ status: string; awaiting_team_id: string | null }>(
    `select status, awaiting_team_id from pm_transfer_offers where id = $1`, [id],
  );
  assert.equal(rows[0].status, 'rejected');
  assert.equal(rows[0].awaiting_team_id, null);
});

test('a party who is not awaited cannot respond (not_your_turn)', async () => {
  const id = await newOffer(SELLER);
  // The buyer opened it; it is the seller's turn, so the buyer cannot act.
  await assert.rejects(() => respond(BUYER, id, 'reject'), /not_your_turn/);
});

test('countering updates the price and flips the turn to the other party', async () => {
  const id = await newOffer(SELLER);
  await respond(SELLER, id, 'counter', 750);
  const { rows } = await db.query<{ status: string; amount_gel: string; awaiting_team_id: string }>(
    `select status, amount_gel, awaiting_team_id from pm_transfer_offers where id = $1`, [id],
  );
  assert.equal(rows[0].status, 'pending'); // still open
  assert.equal(Number(rows[0].amount_gel), 750);
  assert.equal(rows[0].awaiting_team_id, BUYER); // ball is back in the buyer's court
});

test('a counter below the transfer floor is rejected (price_below_floor)', async () => {
  const id = await newOffer(SELLER);
  // Floor is 500 (value 1000 / 2); 400 is too low.
  await assert.rejects(() => respond(SELLER, id, 'counter', 400), /price_below_floor/);
});

test('a non-positive counter is rejected (invalid_price)', async () => {
  const id = await newOffer(SELLER);
  await assert.rejects(() => respond(SELLER, id, 'counter', 0), /invalid_price/);
});

test('an unknown action is rejected (invalid_action)', async () => {
  const id = await newOffer(SELLER);
  await assert.rejects(() => respond(SELLER, id, 'bribe', 900), /invalid_action/);
});
