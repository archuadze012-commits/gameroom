import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// RPC-backed integration test: runs the ACTUAL pm_cancel_transfer_offer SQL
// against a real Postgres engine (pglite). Validates the ownership guards the
// PR2 security audit relied on — a non-participant cannot cancel someone else's
// negotiation — plus the happy path and the pending-only precondition.

let db: PGlite;

const TEAM_A = '11111111-1111-1111-1111-111111111111';
const TEAM_B = '22222222-2222-2222-2222-222222222222';
const OUTSIDER = '99999999-9999-9999-9999-999999999999';

before(async () => {
  db = await bootTestDb();
  // Minimal shape the function reads/writes via pm_transfer_offers%rowtype.
  await db.exec(`
    create table public.pm_transfer_offers (
      id uuid primary key default gen_random_uuid(),
      from_team_id uuid not null,
      to_team_id uuid not null,
      awaiting_team_id uuid,
      status text not null default 'pending',
      updated_at timestamptz default now()
    );
  `);
  await loadRpc(db, 'pm_cancel_transfer_offer');
});

after(async () => {
  await db?.close();
});

async function newOffer(status = 'pending'): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.pm_transfer_offers (from_team_id, to_team_id, awaiting_team_id, status)
     values ($1, $2, $2, $3) returning id`,
    [TEAM_A, TEAM_B, status],
  );
  return rows[0].id;
}

test('a non-participant cannot cancel an offer (not_participant)', async () => {
  const id = await newOffer();
  await assert.rejects(
    () => db.query(`select public.pm_cancel_transfer_offer($1, $2)`, [OUTSIDER, id]),
    /not_participant/,
  );
  // Offer is untouched.
  const { rows } = await db.query<{ status: string }>(
    `select status from public.pm_transfer_offers where id = $1`,
    [id],
  );
  assert.equal(rows[0].status, 'pending');
});

test('either participant can cancel a pending offer', async () => {
  for (const party of [TEAM_A, TEAM_B]) {
    const id = await newOffer();
    await db.query(`select public.pm_cancel_transfer_offer($1, $2)`, [party, id]);
    const { rows } = await db.query<{ status: string; awaiting_team_id: string | null }>(
      `select status, awaiting_team_id from public.pm_transfer_offers where id = $1`,
      [id],
    );
    assert.equal(rows[0].status, 'cancelled');
    assert.equal(rows[0].awaiting_team_id, null);
  }
});

test('a non-pending offer cannot be cancelled (offer_unavailable)', async () => {
  const id = await newOffer('accepted');
  await assert.rejects(
    () => db.query(`select public.pm_cancel_transfer_offer($1, $2)`, [TEAM_A, id]),
    /offer_unavailable/,
  );
});
