import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb } from '../harness/pglite-db.js';

// Coverage for stuck-match recovery. processDue* now stamps claimed_at when it
// flips a fixture ready→processing, and at the start of each run reclaims any
// match stranded in 'processing' past the stale window back to 'ready'. This
// runs the exact reclaim statement the orchestrators use against a real engine.

let db: PGlite;
const STALE_MS = 2 * 60 * 1000;

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_league_fixtures (id uuid primary key default gen_random_uuid(), status text, claimed_at timestamptz);
    create table public.pm_cup_matches   (id uuid primary key default gen_random_uuid(), status text, claimed_at timestamptz);
  `);
});

after(async () => { await db?.close(); });

// The reclaim the orchestrators run: processing → ready when stranded past the
// window (or never timestamped).
async function reclaim(table: string): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  await db.query(
    `update public.${table} set status = 'ready', claimed_at = null
     where status = 'processing' and (claimed_at < $1 or claimed_at is null)`,
    [staleBefore],
  );
}

async function statusOf(table: string, id: string): Promise<string> {
  const { rows } = await db.query<{ status: string }>(`select status from public.${table} where id = $1`, [id]);
  return rows[0].status;
}

for (const table of ['pm_league_fixtures', 'pm_cup_matches']) {
  test(`${table}: a match stranded in processing past the window is reclaimed`, async () => {
    const old = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min ago
    const { rows } = await db.query<{ id: string }>(
      `insert into public.${table} (status, claimed_at) values ('processing', $1) returning id`, [old],
    );
    await reclaim(table);
    assert.equal(await statusOf(table, rows[0].id), 'ready');
  });

  test(`${table}: a fresh in-flight claim is left alone`, async () => {
    const recent = new Date(Date.now() - 30 * 1000).toISOString(); // 30s ago, still working
    const { rows } = await db.query<{ id: string }>(
      `insert into public.${table} (status, claimed_at) values ('processing', $1) returning id`, [recent],
    );
    await reclaim(table);
    assert.equal(await statusOf(table, rows[0].id), 'processing');
  });

  test(`${table}: a legacy processing row with no claimed_at is reclaimed`, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.${table} (status, claimed_at) values ('processing', null) returning id`, [],
    );
    await reclaim(table);
    assert.equal(await statusOf(table, rows[0].id), 'ready');
  });

  test(`${table}: completed matches are never touched`, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.${table} (status, claimed_at) values ('completed', null) returning id`, [],
    );
    await reclaim(table);
    assert.equal(await statusOf(table, rows[0].id), 'completed');
  });
}
