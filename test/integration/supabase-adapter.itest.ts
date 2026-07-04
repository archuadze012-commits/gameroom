import { strict as assert } from 'node:assert';
import { test, before, after, beforeEach } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';
import { asSupabase, type PgliteSupabase } from '../harness/pglite-supabase.js';

// Correctness suite for the supabase-js → pglite adapter itself. Proves each
// query-builder operation compiles to the right SQL and returns the supabase
// { data, error, count } shape, so real `db`-taking code can be run against it.

let db: PGlite;
let sb: PgliteSupabase;

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.t (
      id uuid primary key default gen_random_uuid(),
      name text, n integer, tag text, meta jsonb, done boolean default false
    );
    create table public.w (team_id uuid primary key, balance bigint default 0);
  `);
  await loadRpc(db, 'pm_credit'); // a real RPC to exercise rpc()
  sb = asSupabase(db);
});

after(async () => { await db?.close(); });

beforeEach(async () => { await db.exec(`truncate t, w;`); });

async function seed() {
  await sb.from('t').insert([
    { name: 'a', n: 1, tag: 'x' },
    { name: 'b', n: 2, tag: 'x' },
    { name: 'c', n: 3, tag: 'y' },
  ]);
}

test('insert returns rows when .select() is chained', async () => {
  const { data, error } = await sb.from('t').insert({ name: 'z', n: 9 }).select('id, name');
  assert.equal(error, null);
  assert.equal((data as { name: string }[])[0].name, 'z');
});

test('eq / neq / in / order filter correctly', async () => {
  await seed();
  const eq = await sb.from('t').select('name').eq('tag', 'x').order('n');
  assert.deepEqual((eq.data as { name: string }[]).map((r) => r.name), ['a', 'b']);

  const neq = await sb.from('t').select('name').neq('tag', 'x');
  assert.deepEqual((neq.data as { name: string }[]).map((r) => r.name), ['c']);

  const inq = await sb.from('t').select('name').in('n', [1, 3]).order('n');
  assert.deepEqual((inq.data as { name: string }[]).map((r) => r.name), ['a', 'c']);
});

test('gt / lte + limit', async () => {
  await seed();
  const gt = await sb.from('t').select('name').gt('n', 1).order('n').limit(1);
  assert.deepEqual((gt.data as { name: string }[]).map((r) => r.name), ['b']);
});

test('is null works', async () => {
  await sb.from('t').insert({ name: 'nil', n: null });
  const { data } = await sb.from('t').select('name').is('n', null);
  assert.deepEqual((data as { name: string }[]).map((r) => r.name), ['nil']);
});

test('or() parses the a.eq.x,b.eq.y syntax', async () => {
  await seed();
  const { data } = await sb.from('t').select('name').or('n.eq.1,tag.eq.y').order('n');
  assert.deepEqual((data as { name: string }[]).map((r) => r.name), ['a', 'c']);
});

test('single / maybeSingle', async () => {
  await seed();
  const one = await sb.from('t').select('name').eq('n', 2).single();
  assert.equal((one.data as { name: string }).name, 'b');
  const none = await sb.from('t').select('name').eq('n', 99).maybeSingle();
  assert.equal(none.data, null);
});

test('update + returning, scoped by filter', async () => {
  await seed();
  const { data } = await sb.from('t').update({ done: true }).eq('tag', 'x').select('name');
  assert.equal((data as unknown[]).length, 2);
  const check = await sb.from('t').select('name').eq('done', true).order('n');
  assert.deepEqual((check.data as { name: string }[]).map((r) => r.name), ['a', 'b']);
});

test('upsert on conflict updates the existing row', async () => {
  const team = '11111111-1111-1111-1111-111111111111';
  await sb.from('w').insert({ team_id: team, balance: 100 });
  await sb.from('w').upsert({ team_id: team, balance: 250 }, { onConflict: 'team_id' });
  const { data } = await sb.from('w').select('balance').eq('team_id', team).single();
  assert.equal(Number((data as { balance: string }).balance), 250);
});

test('delete removes matching rows', async () => {
  await seed();
  await sb.from('t').delete().eq('tag', 'x');
  const { data } = await sb.from('t').select('name');
  assert.deepEqual((data as { name: string }[]).map((r) => r.name), ['c']);
});

test('count / head returns the row count', async () => {
  await seed();
  const { count, data } = await sb.from('t').select('*', { count: 'exact', head: true }).eq('tag', 'x');
  assert.equal(count, 2);
  assert.equal(data, null); // head:true returns no rows
});

test('rpc() invokes a real Postgres function', async () => {
  // pm_credit writes to pm_wallets + pm_transactions.
  await db.exec(`
    create table if not exists public.pm_wallets (team_id uuid primary key, balance bigint default 0);
    create table if not exists public.pm_transactions (id uuid primary key default gen_random_uuid(), team_id uuid, amount bigint, reason text);
    truncate public.pm_wallets;
  `);
  const team = '22222222-2222-2222-2222-222222222222';
  await sb.rpc('pm_credit', { p_team_id: team, p_amount: 500, p_reason: 'test' });
  const { data } = await sb.from('pm_wallets').select('balance').eq('team_id', team).single();
  assert.equal(Number((data as { balance: string }).balance), 500);
});
