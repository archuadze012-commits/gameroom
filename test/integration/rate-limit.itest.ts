import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb, loadRpc } from '../harness/pglite-db.js';

// Proves the distributed rate_limit_hit RPC: allows up to `limit` hits in a
// window, blocks beyond it, and resets once the window elapses — atomically, so
// it holds across instances (the whole point vs the per-instance in-memory one).

let db: PGlite;

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.rate_limits (
      bucket_key text primary key,
      count integer not null default 0,
      reset_at timestamptz not null
    );
  `);
  await loadRpc(db, 'rate_limit_hit');
});

after(async () => { await db?.close(); });

async function hit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const r = await db.query<{ rate_limit_hit: boolean }>(
    `select public.rate_limit_hit($1,$2,$3) as rate_limit_hit`, [key, limit, windowMs],
  );
  return r.rows[0].rate_limit_hit;
}

test('allows up to the limit, then blocks', async () => {
  assert.equal(await hit('k1', 3, 60_000), true);  // 1
  assert.equal(await hit('k1', 3, 60_000), true);  // 2
  assert.equal(await hit('k1', 3, 60_000), true);  // 3
  assert.equal(await hit('k1', 3, 60_000), false); // 4 — over
  assert.equal(await hit('k1', 3, 60_000), false); // stays blocked
});

test('separate keys have independent buckets', async () => {
  assert.equal(await hit('k2', 1, 60_000), true);
  assert.equal(await hit('k2', 1, 60_000), false);
  assert.equal(await hit('k3', 1, 60_000), true); // different key, fresh
});

test('an elapsed window resets to allow', async () => {
  assert.equal(await hit('k4', 1, 60_000), true);
  assert.equal(await hit('k4', 1, 60_000), false);
  // Force the window to have expired (deterministic — no wall-clock flake).
  await db.exec(`update public.rate_limits set reset_at = now() - interval '1 minute' where bucket_key = 'k4'`);
  assert.equal(await hit('k4', 1, 60_000), true, 'expired window must reset to allow');
});

test('rejects invalid arguments', async () => {
  await assert.rejects(() => hit('k5', 0, 60_000));   // limit <= 0
  await assert.rejects(() => hit('k5', 5, 0));         // window <= 0
});
