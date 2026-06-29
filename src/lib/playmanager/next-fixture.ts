import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { processDueCupMatches } from '@/lib/playmanager/cups';
import { processDueLeagueMatches } from '@/lib/playmanager/leagues';

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

type Db = { from: (t: string) => any };

async function teamName(db: Db, teamId: string | null): Promise<string> {
  if (!teamId) return 'მოლოდინში';
  const { data } = await db.from('pm_teams').select('name').eq('id', teamId).maybeSingle();
  return (data as { name?: string } | null)?.name ?? 'მეტოქე';
}

// The team's soonest upcoming real fixture (cup or championship), ready or pending.
// Prefers a 'ready' fixture (playable now) over a still-pending bracket slot.
export async function getNextFixtureForTeam(teamId: string): Promise<NextFixture | null> {
  const db = createSupabaseAdminClient() as unknown as Db;

  const { data: cupRows } = await db
    .from('pm_cup_matches')
    .select('id, round, team1_id, team2_id, start_time, status, cup_instance_id, pm_cup_instances(pm_cup_templates(name))')
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .in('status', ['ready', 'pending'])
    .order('start_time', { ascending: true });

  const { data: leagueRows } = await db
    .from('pm_league_fixtures')
    .select('id, round, home_team_id, away_team_id, start_time, status, pm_league_instances(name)')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .in('status', ['ready', 'pending'])
    .order('start_time', { ascending: true });

  const candidates: NextFixture[] = [];

  for (const row of (cupRows ?? []) as any[]) {
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
      startTime: row.start_time,
      ready: row.status === 'ready' && Boolean(opponentId),
    });
  }
  for (const row of (leagueRows ?? []) as any[]) {
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
      ready: row.status === 'ready' && Boolean(opponentId),
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
    const { data } = await db
      .from('pm_cup_matches')
      .select('team1_id, team2_id, score1, score2, status')
      .eq('id', next.fixtureId)
      .maybeSingle();
    const row = data as any;
    if (!row || row.status !== 'completed') return null;
    const isHome = row.team1_id === teamId;
    const scored = isHome ? row.score1 : row.score2;
    const conceded = isHome ? row.score2 : row.score1;
    return { competition: next.competition, opponentName: next.opponentName, scored, conceded, result: outcome(scored, conceded) };
  }

  await db.from('pm_league_fixtures').update({ start_time: nowIso }).eq('id', next.fixtureId);
  await processDueLeagueMatches();
  const { data } = await db
    .from('pm_league_fixtures')
    .select('home_team_id, away_team_id, home_goals, away_goals, status')
    .eq('id', next.fixtureId)
    .maybeSingle();
  const row = data as any;
  if (!row || row.status !== 'completed') return null;
  const isHome = row.home_team_id === teamId;
  const scored = isHome ? row.home_goals : row.away_goals;
  const conceded = isHome ? row.away_goals : row.home_goals;
  return { competition: next.competition, opponentName: next.opponentName, scored, conceded, result: outcome(scored, conceded) };
}

function outcome(scored: number, conceded: number): 'W' | 'D' | 'L' {
  if (scored > conceded) return 'W';
  if (scored < conceded) return 'L';
  return 'D';
}
