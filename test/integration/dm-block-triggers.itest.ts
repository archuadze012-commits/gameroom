import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb } from '../harness/pglite-db.js';

// Applies the REAL 20260716 migration and proves the DB-level triggers reject a
// blocked conversation/message and a dm_privacy-disallowed conversation — the
// backstop that closes the browser-direct-insert and LFG bypasses the app-layer
// gates alone couldn't. Uses an auth.uid() stub driven by a session GUC to
// simulate the initiating user.

let db: PGlite;

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; // A < B so orderUsers → user_a=A, user_b=B

const MIGRATION = fileURLToPath(new URL('../../supabase/migrations/20260716_dm_block_privacy_triggers.sql', import.meta.url));

async function asUser(uid: string | null) {
  await db.query(`select set_config('test.uid', $1, false)`, [uid ?? '']);
}

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('test.uid', true), '')::uuid $$;

    create table public.profiles (id uuid primary key, dm_privacy text not null default 'everyone');
    create table public.follows (follower_id uuid, following_id uuid, primary key (follower_id, following_id));
    create table public.user_blocks (blocker_id uuid, blocked_id uuid, primary key (blocker_id, blocked_id));
    create table public.conversations (id uuid primary key default gen_random_uuid(), user_a uuid, user_b uuid);
    create table public.conversation_messages (id uuid primary key default gen_random_uuid(), conversation_id uuid, sender_id uuid, body text);
  `);
  await db.exec(readFileSync(MIGRATION, 'utf8'));
  await db.query(`insert into public.profiles (id, dm_privacy) values ($1,'everyone'),($2,'everyone')`, [A, B]);
});

after(async () => { await db?.close(); });

test('a new conversation between a blocked pair is rejected', async () => {
  await db.query(`insert into public.user_blocks (blocker_id, blocked_id) values ($1,$2)`, [A, B]);
  await asUser(A);
  await assert.rejects(
    () => db.query(`insert into public.conversations (user_a, user_b) values ($1,$2)`, [A, B]),
    /blocked/,
  );
  // Symmetric: the blocked party can't create it either.
  await asUser(B);
  await assert.rejects(
    () => db.query(`insert into public.conversations (user_a, user_b) values ($1,$2)`, [A, B]),
    /blocked/,
  );
  await db.query(`delete from public.user_blocks`);
});

test('a message injected across a block is rejected even in an existing thread', async () => {
  await asUser(A);
  const { rows } = await db.query<{ id: string }>(
    `insert into public.conversations (user_a, user_b) values ($1,$2) returning id`, [A, B],
  );
  const convId = rows[0].id;
  // Now A blocks B; B trying to message must fail, and so must A.
  await db.query(`insert into public.user_blocks (blocker_id, blocked_id) values ($1,$2)`, [A, B]);
  await assert.rejects(
    () => db.query(`insert into public.conversation_messages (conversation_id, sender_id, body) values ($1,$2,'hi')`, [convId, B]),
    /blocked/,
  );
  await assert.rejects(
    () => db.query(`insert into public.conversation_messages (conversation_id, sender_id, body) values ($1,$2,'hi')`, [convId, A]),
    /blocked/,
  );
  await db.query(`delete from public.user_blocks`);
  await db.query(`delete from public.conversations where id = $1`, [convId]);
});

test("dm_privacy 'nobody' rejects a new conversation from anyone", async () => {
  await db.query(`update public.profiles set dm_privacy = 'nobody' where id = $1`, [B]);
  await asUser(A);
  await assert.rejects(
    () => db.query(`insert into public.conversations (user_a, user_b) values ($1,$2)`, [A, B]),
    /dm_not_allowed/,
  );
  await db.query(`update public.profiles set dm_privacy = 'everyone' where id = $1`, [B]);
});

test("dm_privacy 'followers' allows only when the initiator follows the recipient", async () => {
  await db.query(`update public.profiles set dm_privacy = 'followers' where id = $1`, [B]);
  await asUser(A);
  await assert.rejects(
    () => db.query(`insert into public.conversations (user_a, user_b) values ($1,$2)`, [A, B]),
    /dm_not_allowed/,
  );
  // A follows B → allowed.
  await db.query(`insert into public.follows (follower_id, following_id) values ($1,$2)`, [A, B]);
  const { rows } = await db.query<{ id: string }>(
    `insert into public.conversations (user_a, user_b) values ($1,$2) returning id`, [A, B],
  );
  assert.ok(rows[0].id);
  await db.query(`delete from public.conversations`);
  await db.query(`delete from public.follows`);
  await db.query(`update public.profiles set dm_privacy = 'everyone' where id = $1`, [B]);
});

test("dm_privacy 'everyone' (default) allows a normal new conversation", async () => {
  await asUser(A);
  const { rows } = await db.query<{ id: string }>(
    `insert into public.conversations (user_a, user_b) values ($1,$2) returning id`, [A, B],
  );
  assert.ok(rows[0].id);
  await db.query(`delete from public.conversations`);
});
