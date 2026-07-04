import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { processDueCupMatches } from '@/lib/playmanager/cups';
import { processDueLeagueMatches } from '@/lib/playmanager/leagues';
import { MATCH_STATUS } from '@/lib/playmanager/status';

export type NextFixture = {
  kind: 'cup' | 'league';
  fixtureId: string;
  competition: string;
  opponentName: string;
  isHome: boolean;
  round: number;
  startTime: string;
  ready: boolean;
};

// Minimal, precise structural interface — NOT the concrete SupabaseClient type,
// because tests inject a fake (pglite-backed) client here that only implements
// this exact query surface. Row shapes mirror the generated schema for the
// tables this file actually touches; the embeds are read-only and optional, so
// a single-level relation shape (object | array | null, matching PostgREST's
// cardinality-dependent embed shape) is enough — see the Array.isArray guards
// below where they're unwrapped.
type TeamNameRow = { name: string | null };

type CupFixtureRow = {
  id: string;
  round: number;
  team1_id: string | null;
  team2_id: string | null;
  start_time: string | null;
  status: string;
  cup_instance_id: string | null;
  pm_cup_instances:
    | { pm_cup_templates: { name: string } | { name: string }[] | null }
    | { pm_cup_templates: { name: string } | { name: string }[] | null }[]
    | null;
};

type LeagueFixtureRow = {
  id: string;
  round: number;
  home_team_id: string | null;
  away_team_id: string | null;
  start_time: string;
  status: string;
  pm_league_instances: { name: string } | { name: string }[] | null;
};

type CupResultRow = {
  team1_id: string | null;
  team2_id: string | null;
  score1: number | null;
  score2: number | null;
  status: string;
};

type LeagueResultRow = {
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
};

type ListResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
type SingleResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>;

// A list-shaped query (resolves to T[]); .maybeSingle() narrows to a single T.
interface Query<T> extends ListResult<T> {
  select(columns: string): Query<T>;
  eq(column: string, value: unknown): Query<T>;
  in(column: string, values: readonly unknown[]): Query<T>;
  or(filters: string): Query<T>;
  order(column: string, options?: { ascending?: boolean }): Query<T>;
  update(values: Record<string, unknown>): Query<T>;
  maybeSingle(): SingleResult<T>;
}

type Db = { from<T = unknown>(table: string): Query<T> };

async function teamName(db: Db, teamId: string | null): Promise<string> {
  if (!teamId) return 'მოლოდინში';
  const { data } = await db.from<TeamNameRow>('pm_teams').select('name').eq('id', teamId).maybeSingle();
  return data?.name ?? 'მეტოქე';
}

// The team's soonest upcoming real fixture (cup or championship), ready or pending.
// Prefers a 'ready' fixture (playable now) over a still-pending bracket slot.
// `db` is injectable for tests; production callers use the default admin client.
export async function getNextFixtureForTeam(
  teamId: string,
  db: Db = createSupabaseAdminClient() as unknown as Db,
): Promise<NextFixture | null> {
  const { data: cupRows } = await db
    .from<CupFixtureRow>('pm_cup_matches')
    .select('id, round, team1_id, team2_id, start_time, status, cup_instance_id, pm_cup_instances(pm_cup_templates(name))')
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .in('status', [MATCH_STATUS.ready, MATCH_STATUS.pending])
    .order('start_time', { ascending: true });

  const { data: leagueRows } = await db
    .from<LeagueFixtureRow>('pm_league_fixtures')
    .select('id, round, home_team_id, away_team_id, start_time, status, pm_league_instances(name)')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .in('status', [MATCH_STATUS.ready, MATCH_STATUS.pending])
    .order('start_time', { ascending: true });

  const candidates: NextFixture[] = [];

  for (const row of cupRows ?? []) {
    const isHome = row.team1_id === teamId;
    const opponentId = isHome ? row.team2_id : row.team1_id;
    const inst = Array.isArray(row.pm_cup_instances) ? row.pm_cup_instances[0] : row.pm_cup_instances;
    const tmpl = inst ? (Array.isArray(inst.pm_cup_templates) ? inst.pm_cup_templates[0] : inst.pm_cup_templates) : null;
    candidates.push({
      kind: 'cup',
      fixtureId: row.id,
      competition: tmpl?.name ?? 'თასი',
      opponentName: await teamName(db, opponentId),
      isHome,
      round: row.round,
      // A bracket slot without a scheduled time yet (rare) sorts as "now"
      // rather than breaking the Date parse below.
      startTime: row.start_time ?? new Date().toISOString(),
      ready: row.status === MATCH_STATUS.ready && Boolean(opponentId),
    });
  }
  for (const row of leagueRows ?? []) {
    const isHome = row.home_team_id === teamId;
    const opponentId = isHome ? row.away_team_id : row.home_team_id;
    const inst = Array.isArray(row.pm_league_instances) ? row.pm_league_instances[0] : row.pm_league_instances;
    candidates.push({
      kind: 'league',
      fixtureId: row.id,
      competition: inst?.name ?? 'ჩემპიონატი',
      opponentName: await teamName(db, opponentId),
      isHome,
      round: row.round,
      startTime: row.start_time,
      ready: row.status === MATCH_STATUS.ready && Boolean(opponentId),
    });
  }

  if (candidates.length === 0) return null;
  // Ready first, then soonest start_time.
  candidates.sort((a, b) =>
    (a.ready === b.ready ? 0 : a.ready ? -1 : 1)
    || new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
  return candidates[0];
}

export type PlayedFixture = {
  competition: string;
  opponentName: string;
  scored: number;
  conceded: number;
  result: 'W' | 'D' | 'L';
};

// Play the team's next READY fixture now: mark it due and reuse the existing
// (tested) processDue* simulators, then read back the result. Returns null if
// there is no ready fixture to play.
export async function playNextFixtureForTeam(teamId: string): Promise<PlayedFixture | null> {
  const db = createSupabaseAdminClient() as unknown as Db;
  const next = await getNextFixtureForTeam(teamId);
  if (!next || !next.ready) return null;

  const nowIso = new Date().toISOString();

  if (next.kind === 'cup') {
    await db.from('pm_cup_matches').update({ start_time: nowIso }).eq('id', next.fixtureId);
    await processDueCupMatches();
    const { data: row } = await db
      .from<CupResultRow>('pm_cup_matches')
      .select('team1_id, team2_id, score1, score2, status')
      .eq('id', next.fixtureId)
      .maybeSingle();
    if (!row || row.status !== MATCH_STATUS.completed) return null;
    const isHome = row.team1_id === teamId;
    const scored = (isHome ? row.score1 : row.score2) ?? 0;
    const conceded = (isHome ? row.score2 : row.score1) ?? 0;
    return { competition: next.competition, opponentName: next.opponentName, scored, conceded, result: outcome(scored, conceded) };
  }

  await db.from('pm_league_fixtures').update({ start_time: nowIso }).eq('id', next.fixtureId);
  await processDueLeagueMatches();
  const { data: row } = await db
    .from<LeagueResultRow>('pm_league_fixtures')
    .select('home_team_id, away_team_id, home_goals, away_goals, status')
    .eq('id', next.fixtureId)
    .maybeSingle();
  if (!row || row.status !== MATCH_STATUS.completed) return null;
  const isHome = row.home_team_id === teamId;
  const scored = (isHome ? row.home_goals : row.away_goals) ?? 0;
  const conceded = (isHome ? row.away_goals : row.home_goals) ?? 0;
  return { competition: next.competition, opponentName: next.opponentName, scored, conceded, result: outcome(scored, conceded) };
}

function outcome(scored: number, conceded: number): 'W' | 'D' | 'L' {
  if (scored > conceded) return 'W';
  if (scored < conceded) return 'L';
  return 'D';
}
