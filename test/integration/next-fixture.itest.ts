import { strict as assert } from 'node:assert';
import { test, before, after, mock } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { bootTestDb } from '../harness/pglite-db.js';
import { asSupabase } from '../harness/pglite-supabase.js';

// End-to-end proof of the supabase-js → pglite adapter: runs the REAL
// getNextFixtureForTeam (unmodified app code) against a real Postgres, injecting
// the adapter as its db. Exercises .or(), .in(), .order(), .maybeSingle(), and
// the flat-column projection (the pm_cup_instances(...) embed is dropped, so the
// competition name falls back to its default — the selection logic is real).

let db: PGlite;
let getNextFixtureForTeam: typeof import('../../src/lib/playmanager/next-fixture.js').getNextFixtureForTeam;

const ME = 'aaaa1111-0000-0000-0000-000000000001';
const CUP_FOE = 'bbbb2222-0000-0000-0000-000000000002';
const LEAGUE_FOE = 'cccc3333-0000-0000-0000-000000000003';

before(async () => {
  // next-fixture.ts transitively imports server-only (via the admin client and
  // cups/leagues); stub it so the module loads under the plain node runner. We
  // inject the adapter as db, so the real admin client is never constructed.
  mock.module('server-only', { namedExports: {} });
  ({ getNextFixtureForTeam } = await import('../../src/lib/playmanager/next-fixture.js'));

  db = await bootTestDb();
  await db.exec(`
    create table public.pm_teams (id uuid primary key, name text);
    create table public.pm_cup_matches (
      id uuid primary key default gen_random_uuid(),
      round integer, team1_id uuid, team2_id uuid, start_time timestamptz,
      status text, cup_instance_id uuid
    );
    create table public.pm_league_fixtures (
      id uuid primary key default gen_random_uuid(),
      round integer, home_team_id uuid, away_team_id uuid, start_time timestamptz, status text
    );
  `);
  await db.query(`insert into pm_teams (id, name) values ($1,'My Club'),($2,'Cup Foe'),($3,'League Foe')`, [
    ME, CUP_FOE, LEAGUE_FOE,
  ]);
});

after(async () => { await db?.close(); });

test('picks the ready cup tie over an earlier pending league fixture', async () => {
  await db.query(
    `insert into pm_cup_matches (round, team1_id, team2_id, start_time, status)
     values (1, $1, $2, '2026-07-20T00:00:00Z', 'ready')`,
    [ME, CUP_FOE],
  );
  await db.query(
    `insert into pm_league_fixtures (round, home_team_id, away_team_id, start_time, status)
     values (2, $1, $2, '2026-07-05T00:00:00Z', 'pending')`,
    [LEAGUE_FOE, ME],
  );

  const next = await getNextFixtureForTeam(ME, asSupabase(db) as never);

  assert.ok(next, 'a fixture is returned');
  assert.equal(next!.kind, 'cup'); // ready beats the earlier pending one
  assert.equal(next!.ready, true);
  assert.equal(next!.isHome, true); // ME is team1 in the cup tie
  assert.equal(next!.opponentName, 'Cup Foe'); // resolved via a real pm_teams lookup
});
