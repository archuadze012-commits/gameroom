import { strict as assert } from 'node:assert';
import { test, before, after, mock } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb } from '../harness/pglite-db.js';
import { asSupabase } from '../harness/pglite-supabase.js';

// Exercises the security-critical privacy helpers (isBlocked, canReceiveDmFrom)
// against a real engine via the pglite adapter. These back the DM-creation and
// message-send gates, so a wrong answer means either an unwanted DM gets through
// or a legitimate one is silently dropped.

let db: PGlite;
let isBlocked: typeof import('../../src/lib/blocks.js').isBlocked;
let canReceiveDmFrom: typeof import('../../src/lib/blocks.js').canReceiveDmFrom;

const A = '00000000-0000-0000-0000-0000000000a1';
const B = '00000000-0000-0000-0000-0000000000b2';
const C = '00000000-0000-0000-0000-0000000000c3';

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.profiles (id uuid primary key, dm_privacy text not null default 'everyone');
    create table public.user_blocks (
      blocker_id uuid not null,
      blocked_id uuid not null,
      created_at timestamptz not null default now(),
      primary key (blocker_id, blocked_id),
      constraint user_blocks_no_self check (blocker_id <> blocked_id)
    );
    create table public.follows (
      follower_id uuid not null,
      following_id uuid not null,
      primary key (follower_id, following_id)
    );
  `);
  await db.query(`insert into public.profiles (id, dm_privacy) values ($1,'everyone'),($2,'everyone'),($3,'everyone')`, [A, B, C]);

  mock.module('server-only', { namedExports: {} });
  const sb = asSupabase(db);
  mock.module('@/lib/supabase/admin', { namedExports: { createSupabaseAdminClient: () => sb } });

  ({ isBlocked, canReceiveDmFrom } = await import('../../src/lib/blocks.js'));
});

after(async () => { await db?.close(); });

test('isBlocked is false when no block exists', async () => {
  assert.equal(await isBlocked(A, B), false);
});

test('isBlocked is symmetric: a block in either direction blocks both ways', async () => {
  await db.query(`insert into public.user_blocks (blocker_id, blocked_id) values ($1,$2)`, [A, B]);
  assert.equal(await isBlocked(A, B), true, 'blocker→blocked');
  assert.equal(await isBlocked(B, A), true, 'blocked→blocker (symmetric)');
  // An unrelated third party is unaffected.
  assert.equal(await isBlocked(A, C), false);
  assert.equal(await isBlocked(B, C), false);
});

test('isBlocked short-circuits self / empty', async () => {
  assert.equal(await isBlocked(A, A), false);
  assert.equal(await isBlocked('', B), false);
});

test('canReceiveDmFrom: everyone → always allowed', async () => {
  await db.query(`update public.profiles set dm_privacy = 'everyone' where id = $1`, [C]);
  assert.equal(await canReceiveDmFrom(C, A), true);
});

test('canReceiveDmFrom: nobody → never allowed', async () => {
  await db.query(`update public.profiles set dm_privacy = 'nobody' where id = $1`, [C]);
  assert.equal(await canReceiveDmFrom(C, A), false);
});

test('canReceiveDmFrom: followers → only if the sender follows the recipient', async () => {
  await db.query(`update public.profiles set dm_privacy = 'followers' where id = $1`, [C]);
  // A does not follow C yet → denied.
  assert.equal(await canReceiveDmFrom(C, A), false);
  // A follows C → allowed.
  await db.query(`insert into public.follows (follower_id, following_id) values ($1,$2)`, [A, C]);
  assert.equal(await canReceiveDmFrom(C, A), true);
  // C following A (wrong direction) must NOT grant A access.
  assert.equal(await canReceiveDmFrom(C, B), false);
});
