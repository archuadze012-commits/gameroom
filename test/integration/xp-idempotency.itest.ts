import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// Proves the XP-farming fix: award_xp_once grants XP at most once per
// (source_type, source_id), so a follow→unfollow→follow or like→unlike→like loop
// against an alt account cannot inflate XP. Second+ calls for the same key are
// no-ops (return false) and never touch profiles.xp.

let db: PGlite;
const RECIPIENT = 'aaaa0000-0000-0000-0000-000000000001';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.profiles (
      id uuid primary key,
      xp integer default 0,
      level integer default 1,
      last_xp_at timestamptz
    );
    create table public.xp_events (
      id bigint generated always as identity primary key,
      user_id uuid not null,
      source_type text not null,
      source_id text not null,
      amount integer not null,
      created_at timestamptz not null default now(),
      constraint xp_events_source_uniq unique (source_type, source_id)
    );
    insert into public.profiles (id, xp) values ('${RECIPIENT}', 0);
  `);
  await loadRpc(db, 'award_xp');
  await loadRpc(db, 'award_xp_once');
});

after(async () => { await db?.close(); });

async function xp(): Promise<number> {
  const r = await db.query<{ xp: number }>(`select xp from public.profiles where id = $1`, [RECIPIENT]);
  return Number(r.rows[0].xp);
}
async function once(amount: number, type: string, id: string): Promise<boolean> {
  const r = await db.query<{ award_xp_once: boolean }>(
    `select public.award_xp_once($1,$2,$3,$4) as award_xp_once`, [RECIPIENT, amount, type, id],
  );
  return r.rows[0].award_xp_once;
}

test('first award for a relationship grants XP and returns true', async () => {
  assert.equal(await once(5, 'follow', 'follower1:recipient'), true);
  assert.equal(await xp(), 5);
});

test('repeat award for the SAME relationship is a no-op (the farming loop)', async () => {
  // Simulate follow→unfollow→follow ×3 for the same pair.
  for (let i = 0; i < 3; i++) {
    assert.equal(await once(5, 'follow', 'follower1:recipient'), false, 'duplicate must not award');
  }
  assert.equal(await xp(), 5, 'xp must stay at the single legitimate award');
});

test('a different relationship of the same type still awards', async () => {
  assert.equal(await once(5, 'follow', 'follower2:recipient'), true);
  assert.equal(await xp(), 10);
});

test('a different source_type with a colliding source_id awards independently', async () => {
  assert.equal(await once(1, 'post_like', 'follower1:recipient'), true);
  assert.equal(await xp(), 11);
});

test('the ledger has exactly one row per unique key', async () => {
  const r = await db.query<{ n: number }>(`select count(*)::int as n from public.xp_events`);
  assert.equal(Number(r.rows[0].n), 3); // follower1:follow, follower2:follow, follower1:post_like
});
