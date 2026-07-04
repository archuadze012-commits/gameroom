import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb } from '../harness/pglite-db.js';

// Concurrency-safety coverage for the lazy cup/league processing model. The
// processDue* functions in cups.ts / leagues.ts are TypeScript orchestrators
// (supabase-js + a TS match engine), so we can't load them as RPCs — but their
// SAFETY rests entirely on two guarded status transitions that the client
// compiles straight to SQL:
//
//   claim  : UPDATE ... SET status='processing' WHERE id=X AND status='ready'
//   payout : UPDATE ... SET status='completed'  WHERE id=X AND status='in_progress'
//
// If two processors race (two page visits triggering processDue at once), the
// second guarded UPDATE matches zero rows and that processor skips — no double
// simulation, double XP, or double prize. This runs those exact statements
// against a real engine to prove the invariant. (Full TS-orchestration coverage
// would need a supabase-js→pglite adapter — separate infra.)

let db: PGlite;

before(async () => {
  db = await bootTestDb();
  await db.exec(`
    create table public.pm_league_fixtures (id uuid primary key default gen_random_uuid(), status text);
    create table public.pm_cup_matches   (id uuid primary key default gen_random_uuid(), status text);
    create table public.pm_cup_instances (id uuid primary key default gen_random_uuid(), status text);
  `);
});

after(async () => {
  await db?.close();
});

// The claim statement the orchestrators run, as raw SQL. Returns the claimed ids.
async function claim(table: string, id: string): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `update public.${table} set status = 'processing' where id = $1 and status = 'ready' returning id`,
    [id],
  );
  return rows.map((r) => r.id);
}

async function seedReady(table: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.${table} (status) values ('ready') returning id`,
    [],
  );
  return rows[0].id;
}

for (const table of ['pm_league_fixtures', 'pm_cup_matches']) {
  test(`${table}: only one processor claims a ready match`, async () => {
    const id = await seedReady(table);

    const first = await claim(table, id); // winner
    const second = await claim(table, id); // racing processor

    assert.deepEqual(first, [id], 'first claim takes the fixture');
    assert.deepEqual(second, [], 'second claim gets nothing and skips');

    const { rows } = await db.query<{ status: string }>(
      `select status from public.${table} where id = $1`,
      [id],
    );
    assert.equal(rows[0].status, 'processing');
  });

  test(`${table}: an already-processed match is never re-claimed`, async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.${table} (status) values ('completed') returning id`,
      [],
    );
    const claimed = await claim(table, rows[0].id);
    assert.deepEqual(claimed, [], 'completed match cannot be claimed');
  });
}

test('prize payout runs once (in_progress → completed guard)', async () => {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.pm_cup_instances (status) values ('in_progress') returning id`,
    [],
  );
  const id = rows[0].id;

  const payout = async () => {
    const { rows: r } = await db.query<{ id: string }>(
      `update public.pm_cup_instances set status = 'completed' where id = $1 and status = 'in_progress' returning id`,
      [id],
    );
    return r.map((x) => x.id);
  };

  assert.deepEqual(await payout(), [id], 'first payout settles the cup');
  assert.deepEqual(await payout(), [], 'second payout is a no-op — prize paid once');
});
