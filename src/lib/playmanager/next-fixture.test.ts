import { strict as assert } from 'node:assert';
import { test, mock, before } from 'node:test';

// Integration-smoke coverage for next-fixture selection. The real flow is
// DB-backed, so we inject a tiny fake Supabase client (chainable query builder)
// seeded with cup + league fixture rows and assert the selection/merge logic:
// ready-first, soonest start, correct home/away + opponent resolution.
//
// next-fixture.ts transitively imports `server-only` (via the admin client and
// cups/leagues). Stub it so the module loads under the plain node test runner —
// we inject a fake db, so the real admin client is never constructed. Requires
// the --experimental-test-module-mocks flag (set in the test:unit script). The
// stub + import run in before() because tsx compiles tests to CJS (no top-level
// await).
let getNextFixtureForTeam: typeof import('./next-fixture.js').getNextFixtureForTeam;

before(async () => {
  mock.module('server-only', { namedExports: {} });
  ({ getNextFixtureForTeam } = await import('./next-fixture.js'));
});

type Row = Record<string, unknown>;

// Minimal fake of the query surface getNextFixtureForTeam uses:
//   from(t).select().or().in().order()  -> { data }
//   from('pm_teams').select().eq('id',v).maybeSingle() -> { data }
function fakeDb(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const builder = {
        select: () => builder,
        or: () => builder,
        in: () => builder,
        eq: (col: string, val: unknown) => {
          rows = rows.filter((r) => r[col] === val);
          return builder;
        },
        order: () => Promise.resolve({ data: rows }),
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null }),
      };
      return builder;
    },
  } as unknown as Parameters<typeof getNextFixtureForTeam>[1];
}

const ME = 'team-me';

test('returns null when the team has no upcoming fixtures', async () => {
  const next = await getNextFixtureForTeam(ME, fakeDb({}));
  assert.equal(next, null);
});

test('surfaces a single ready league fixture with correct home/opponent', async () => {
  const next = await getNextFixtureForTeam(
    ME,
    fakeDb({
      pm_league_fixtures: [
        {
          id: 'L1',
          round: 3,
          home_team_id: ME,
          away_team_id: 'opp1',
          start_time: '2026-07-10T00:00:00Z',
          status: 'ready',
          pm_league_instances: { name: 'A ლიგა' },
        },
      ],
      pm_teams: [{ id: 'opp1', name: 'Rivals FC' }],
    }),
  );
  assert.ok(next);
  assert.equal(next!.kind, 'league');
  assert.equal(next!.fixtureId, 'L1');
  assert.equal(next!.competition, 'A ლიგა');
  assert.equal(next!.opponentName, 'Rivals FC');
  assert.equal(next!.isHome, true);
  assert.equal(next!.ready, true);
});

test('prefers a ready fixture over an earlier-scheduled pending one', async () => {
  const next = await getNextFixtureForTeam(
    ME,
    fakeDb({
      // Pending league fixture is scheduled SOONER…
      pm_league_fixtures: [
        {
          id: 'L2',
          round: 2,
          home_team_id: 'opp3',
          away_team_id: ME,
          start_time: '2026-07-05T00:00:00Z',
          status: 'pending',
          pm_league_instances: { name: 'ლიგა' },
        },
      ],
      // …but the ready cup tie should still win (playable now).
      pm_cup_matches: [
        {
          id: 'C1',
          round: 1,
          team1_id: ME,
          team2_id: 'opp2',
          start_time: '2026-07-20T00:00:00Z',
          status: 'ready',
          pm_cup_instances: { pm_cup_templates: { name: 'თასი' } },
        },
      ],
      pm_teams: [
        { id: 'opp2', name: 'Cup Foe' },
        { id: 'opp3', name: 'League Foe' },
      ],
    }),
  );
  assert.ok(next);
  assert.equal(next!.fixtureId, 'C1');
  assert.equal(next!.kind, 'cup');
  assert.equal(next!.ready, true);
  assert.equal(next!.isHome, true);
  assert.equal(next!.opponentName, 'Cup Foe');
});

test('among ready fixtures, picks the soonest start time', async () => {
  const next = await getNextFixtureForTeam(
    ME,
    fakeDb({
      pm_league_fixtures: [
        {
          id: 'LATER',
          round: 4,
          home_team_id: ME,
          away_team_id: 'a',
          start_time: '2026-08-01T00:00:00Z',
          status: 'ready',
          pm_league_instances: { name: 'L' },
        },
      ],
      pm_cup_matches: [
        {
          id: 'SOONER',
          round: 2,
          team1_id: 'b',
          team2_id: ME,
          start_time: '2026-07-15T00:00:00Z',
          status: 'ready',
          pm_cup_instances: { pm_cup_templates: { name: 'C' } },
        },
      ],
      pm_teams: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
    }),
  );
  assert.ok(next);
  assert.equal(next!.fixtureId, 'SOONER');
  assert.equal(next!.isHome, false); // ME is team2 in the cup tie
});

test("a 'ready' bracket slot with no opponent yet is not marked playable", async () => {
  const next = await getNextFixtureForTeam(
    ME,
    fakeDb({
      pm_cup_matches: [
        {
          id: 'BYE',
          round: 2,
          team1_id: ME,
          team2_id: null,
          start_time: '2026-07-12T00:00:00Z',
          status: 'ready',
          pm_cup_instances: { pm_cup_templates: { name: 'თასი' } },
        },
      ],
      pm_teams: [],
    }),
  );
  assert.ok(next);
  assert.equal(next!.fixtureId, 'BYE');
  assert.equal(next!.ready, false); // opponent still TBD → not playable
  assert.equal(next!.opponentName, 'მოლოდინში');
});
