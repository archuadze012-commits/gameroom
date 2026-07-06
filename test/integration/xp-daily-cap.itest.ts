import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// Proves award_xp_capped: create-flow XP is granted only up to a daily cap per
// source, so create→delete→create can't farm unbounded XP (each award counts
// toward the cap regardless of later deletion of the content).

let db: PGlite;
const U = 'bbbb0000-0000-0000-0000-000000000001';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.profiles (id uuid primary key, xp integer default 0, level integer default 1, last_xp_at timestamptz);
    create table public.xp_events (
      id bigint generated always as identity primary key,
      user_id uuid not null, source_type text not null, source_id text not null,
      amount integer not null, created_at timestamptz not null default now(),
      constraint xp_events_source_uniq unique (source_type, source_id)
    );
    insert into public.profiles (id, xp) values ('${U}', 0);
  `);
  await loadRpc(db, 'award_xp');
  await loadRpc(db, 'award_xp_capped');
});
after(async () => { await db?.close(); });

const xp = async () => Number((await db.query<{ xp: number }>(`select xp from profiles where id=$1`, [U])).rows[0].xp);
const capped = async (amount: number, type: string, cap: number) =>
  (await db.query<{ award_xp_capped: boolean }>(`select public.award_xp_capped($1,$2,$3,$4) as award_xp_capped`, [U, amount, type, cap])).rows[0].award_xp_capped;

test('awards up to the daily cap, then stops', async () => {
  assert.equal(await capped(10, 'feed_create', 3), true);  // 1
  assert.equal(await capped(10, 'feed_create', 3), true);  // 2
  assert.equal(await capped(10, 'feed_create', 3), true);  // 3
  assert.equal(await capped(10, 'feed_create', 3), false); // capped
  assert.equal(await capped(10, 'feed_create', 3), false);
  assert.equal(await xp(), 30, 'only the 3 within-cap awards count');
});

test('a different source has its own independent cap', async () => {
  assert.equal(await capped(5, 'lfg_create', 2), true);
  assert.equal(await capped(5, 'lfg_create', 2), true);
  assert.equal(await capped(5, 'lfg_create', 2), false);
  assert.equal(await xp(), 40); // 30 + 2*5
});

test('yesterday\'s awards do not count against today (daily window)', async () => {
  // Age the feed_create events to yesterday, then a fresh award should succeed.
  await db.exec(`update xp_events set created_at = now() - interval '1 day' where source_type='feed_create'`);
  assert.equal(await capped(10, 'feed_create', 3), true, 'new day resets the cap');
  assert.equal(await xp(), 50);
});

test('rejects invalid arguments', async () => {
  await assert.rejects(() => capped(0, 'x', 3));   // amount <= 0
  await assert.rejects(() => capped(10, 'x', 0));  // cap <= 0
});
