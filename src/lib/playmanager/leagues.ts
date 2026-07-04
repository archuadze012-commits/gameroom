import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatGel } from '@/lib/playmanager/economy';
import { buildMatchProfile, simulateMatch, type MatchSettings, type PlayerRow } from '@/lib/playmanager/match-engine';
import { getStaffBonuses, type StaffRoleKey } from '@/lib/playmanager/staff';
import { generateSingleElimBracket } from '@/lib/tournament/generate-bracket';

export type LeagueFormat = 'round_robin' | 'knockout';

type Db = ReturnType<typeof createSupabaseAdminClient>;

type LeagueRegistrationRow = { id: string; status: string; max_teams: number };
type LeagueFormatRow = { id: string; status: string; format: string };

type DueLeagueFixtureRow = {
  id: string;
  league_id: string;
  round: number;
  position: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

type LeagueInstanceSummary = { id: string; format: string; prize_pool: number; name: string };

type FinalizingLeagueRow = { id: string; status: string; prize_pool: number; name: string };

type TeamStanding = { team_id: string; points: number; goals_for: number; goals_against: number };

// Minutes between league rounds (each round's fixtures unlock progressively).
const ROUND_INTERVAL_MIN = 10;


// ── Creation / registration ──────────────────────────────────────────────────

export async function createLeague(input: {
  name: string;
  divisionLevel: number;
  maxTeams: number;
  prizePool: number;
  format?: LeagueFormat;
}) {
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('pm_league_instances')
    .insert({
      name: input.name,
      division_level: input.divisionLevel,
      max_teams: input.maxTeams,
      prize_pool: input.prizePool,
      format: input.format ?? 'round_robin',
      status: 'registration',
    })
    .select('id')
    .single();
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, leagueId: data.id };
}

export async function joinLeague(teamId: string, leagueId: string) {
  const db = createSupabaseAdminClient();

  const { data: league } = await db
    .from('pm_league_instances')
    .select('id, status, max_teams')
    .eq('id', leagueId)
    .maybeSingle()
    .returns<LeagueRegistrationRow>();
  if (!league) return { success: false as const, error: 'league_not_found' };
  if (league.status !== 'registration') return { success: false as const, error: 'registration_closed' };

  const { count } = await db
    .from('pm_league_participants')
    .select('id', { count: 'exact', head: true })
    .eq('league_id', leagueId);
  if ((count ?? 0) >= league.max_teams) return { success: false as const, error: 'league_full' };

  const { error } = await db
    .from('pm_league_participants')
    .insert({ league_id: leagueId, team_id: teamId });
  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return { success: false as const, error: 'already_registered' };
    }
    return { success: false as const, error: error.message };
  }
  return { success: true as const };
}

// ── Fixtures (single round-robin via the circle method) ──────────────────────

function buildRoundRobin(teamIds: string[]): Array<{ round: number; home: string; away: string }> {
  const ids = [...teamIds];
  if (ids.length % 2 === 1) ids.push('BYE');
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixtures: Array<{ round: number; home: string; away: string }> = [];
  let order = [...ids];

  for (let r = 0; r < rounds; r += 1) {
    for (let i = 0; i < half; i += 1) {
      const home = order[i];
      const away = order[n - 1 - i];
      if (home !== 'BYE' && away !== 'BYE') {
        // Alternate home/away per round for fairness.
        if (r % 2 === 0) fixtures.push({ round: r + 1, home, away });
        else fixtures.push({ round: r + 1, home: away, away: home });
      }
    }
    // Rotate, keeping the first element fixed.
    order = [order[0], order[n - 1], ...order.slice(1, n - 1)];
  }
  return fixtures;
}

export async function startLeague(leagueId: string) {
  const db = createSupabaseAdminClient();

  const { data: league } = await db
    .from('pm_league_instances')
    .select('id, status, format')
    .eq('id', leagueId)
    .maybeSingle()
    .returns<LeagueFormatRow>();
  if (!league) return { success: false as const, error: 'league_not_found' };
  if (league.status !== 'registration') return { success: false as const, error: 'already_started' };

  const { data: participants } = await db
    .from('pm_league_participants')
    .select('team_id')
    .eq('league_id', leagueId);
  const teamIds = (participants ?? []).map((p) => p.team_id);
  if (teamIds.length < 2) return { success: false as const, error: 'not_enough_teams' };

  // Optimistic lock: only the caller that flips registration→in_progress builds fixtures.
  const { data: locked } = await db
    .from('pm_league_instances')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', leagueId)
    .eq('status', 'registration')
    .select('id');
  if (!locked || locked.length === 0) return { success: false as const, error: 'already_started' };

  const now = Date.now();
  let rows: Array<{
    league_id: string;
    round: number;
    position?: number;
    home_team_id: string | null;
    away_team_id: string | null;
    winner_id?: string | null;
    status: string;
    start_time: string;
  }>;

  if (league.format === 'knockout') {
    const { data: teamRows } = await db.from('pm_teams').select('id, name').in('id', teamIds);
    const nameById = new Map<string, string>((teamRows ?? []).map((t) => [t.id, t.name]));
    const seeded = [...teamIds]
      .map((id, i) => ({ id, sort: ((i * 2654435761) % 1000) + Math.floor((now / (i + 1)) % 1000) }))
      .sort((a, b) => a.sort - b.sort)
      .map((entry, i) => ({ id: entry.id, name: nameById.get(entry.id) ?? 'Team', seed: i + 1 }));
    const { matches } = generateSingleElimBracket(seeded);
    rows = matches.map((m) => ({
      league_id: leagueId,
      round: m.round,
      position: m.position,
      home_team_id: m.player1?.id ?? null,
      away_team_id: m.player2?.id ?? null,
      winner_id: m.winner?.id ?? null,
      status: m.status ?? 'pending',
      start_time: new Date(now + (m.round - 1) * ROUND_INTERVAL_MIN * 60000).toISOString(),
    }));
  } else {
    rows = buildRoundRobin(teamIds).map((fixture) => ({
      league_id: leagueId,
      round: fixture.round,
      home_team_id: fixture.home,
      away_team_id: fixture.away,
      status: 'ready',
      start_time: new Date(now + (fixture.round - 1) * ROUND_INTERVAL_MIN * 60000).toISOString(),
    }));
  }

  await db.from('pm_league_fixtures').insert(rows);
  return { success: true as const, fixtures: rows.length };
}

// ── Simulation (lazy, mirrors processDueCupMatches) ──────────────────────────

// A fixture claimed but not completed within this window is treated as stranded
// (its processor died) and reset to 'ready' so the next run retries it.
const STALE_CLAIM_MS = 2 * 60 * 1000;

export async function processDueLeagueMatches() {
  const db = createSupabaseAdminClient();

  // Recover fixtures stranded in 'processing' (crashed mid-simulate) so they get
  // retried. The completion write is atomic, so a stranded row has no partial
  // result — 'ready' is a clean state to return it to.
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
  await db
    .from('pm_league_fixtures')
    .update({ status: 'ready', claimed_at: null })
    .eq('status', 'processing')
    .or(`claimed_at.lt.${staleBefore},claimed_at.is.null`);

  const { data: dueMatches } = await db
    .from('pm_league_fixtures')
    .select('id, league_id, round, position, home_team_id, away_team_id')
    .eq('status', 'ready')
    .lte('start_time', new Date().toISOString())
    .order('round', { ascending: true })
    .returns<DueLeagueFixtureRow[]>();
  if (!dueMatches || dueMatches.length === 0) return;

  const leagueIds = Array.from(new Set(dueMatches.map((m) => m.league_id)));
  const { data: instances } = await db
    .from('pm_league_instances')
    .select('id, format, prize_pool, name')
    .in('id', leagueIds)
    .returns<LeagueInstanceSummary[]>();
  const instanceById = new Map((instances ?? []).map((i) => [i.id, i]));

  const roundRobinAffected = new Set<string>();

  for (const match of dueMatches) {
    const homeId = match.home_team_id;
    const awayId = match.away_team_id;
    if (!homeId || !awayId) continue; // bracket slot not filled yet

    // Atomically claim the fixture (ready → processing). A racing processor gets
    // no rows and skips — prevents double standings, double XP, double prize.
    const { data: claimed } = await db
      .from('pm_league_fixtures')
      .update({ status: 'processing', claimed_at: new Date().toISOString() })
      .eq('id', match.id)
      .eq('status', 'ready')
      .select('id');
    if (!claimed || claimed.length === 0) continue;

    const instance = instanceById.get(match.league_id);
    const isKnockout = instance?.format === 'knockout';

    const [homeRows, awayRows, homeSettings, awaySettings, homeBonuses, awayBonuses] = await Promise.all([
      loadTeamRows(homeId),
      loadTeamRows(awayId),
      loadSettings(homeId),
      loadSettings(awayId),
      loadStaffBonuses(homeId),
      loadStaffBonuses(awayId),
    ]);

    const simulated = simulateMatch(
      homeId,
      buildMatchProfile(homeRows, homeSettings, homeBonuses),
      awayId,
      buildMatchProfile(awayRows, awaySettings, awayBonuses),
    );
    const homeGoals = simulated.score1;
    const awayGoals = simulated.score2;
    // Knockout never draws — simulateMatch always resolves a winner.
    const winnerId = isKnockout ? simulated.winnerId : (homeGoals === awayGoals ? null : simulated.winnerId);

    await db.from('pm_league_fixtures').update({
      home_goals: homeGoals,
      away_goals: awayGoals,
      winner_id: winnerId,
      status: 'completed',
      played_at: new Date().toISOString(),
    }).eq('id', match.id);

    await Promise.all([
      db.rpc('pm_grant_match_development', { p_team_id: homeId }),
      db.rpc('pm_grant_match_development', { p_team_id: awayId }),
    ]);

    if (isKnockout) {
      await propagateKnockout(db, instance ?? null, match, winnerId as string);
    } else {
      await Promise.all([
        applyStanding(db, match.league_id, homeId, homeGoals, awayGoals),
        applyStanding(db, match.league_id, awayId, awayGoals, homeGoals),
      ]);
      roundRobinAffected.add(match.league_id);
    }
  }

  for (const leagueId of roundRobinAffected) {
    await maybeFinalizeLeague(db, leagueId);
  }
}

// Knockout: advance the winner into the next round's slot; if there is no next
// match this was the final → complete the tournament and pay the champion.
async function propagateKnockout(
  db: Db,
  instance: LeagueInstanceSummary | null,
  match: DueLeagueFixtureRow,
  winnerId: string,
) {
  const nextRound = match.round + 1;
  const nextPosition = Math.ceil((match.position ?? 1) / 2);
  const isHomeSlot = (match.position ?? 1) % 2 !== 0;

  const { data: nextMatch } = await db
    .from('pm_league_fixtures')
    .select('id, home_team_id, away_team_id')
    .eq('league_id', match.league_id)
    .eq('round', nextRound)
    .eq('position', nextPosition)
    .maybeSingle();

  if (!nextMatch) {
    // Final completed → finalize + prize.
    await db.from('pm_league_instances')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', match.league_id)
      .eq('status', 'in_progress');
    const prize = Number(instance?.prize_pool ?? 0);
    if (prize > 0) {
      await db.rpc('pm_credit', { p_team_id: winnerId, p_amount: prize, p_reason: 'euro_winner' });
      await db.rpc('pm_log_event', {
        p_team_id: winnerId,
        p_category: 'finance',
        p_title: `${instance?.name ?? 'ევრო ტურნირი'} მოიგე!`,
        p_detail: `+${formatGel(prize)}`,
        p_accent: 'gold',
      });
    }
    return;
  }

  const update: { home_team_id?: string; away_team_id?: string; status?: string } = isHomeSlot
    ? { home_team_id: winnerId }
    : { away_team_id: winnerId };
  const otherSlot = isHomeSlot ? nextMatch.away_team_id : nextMatch.home_team_id;
  if (otherSlot) update.status = 'ready';
  await db.from('pm_league_fixtures').update(update).eq('id', nextMatch.id);
}

async function applyStanding(
  db: Db,
  leagueId: string,
  teamId: string,
  goalsFor: number,
  goalsAgainst: number,
) {
  const { data: row } = await db
    .from('pm_league_participants')
    .select('id, played, won, drawn, lost, goals_for, goals_against, points')
    .eq('league_id', leagueId)
    .eq('team_id', teamId)
    .maybeSingle();
  if (!row) return;
  const win = goalsFor > goalsAgainst;
  const draw = goalsFor === goalsAgainst;
  await db.from('pm_league_participants').update({
    played: row.played + 1,
    won: row.won + (win ? 1 : 0),
    drawn: row.drawn + (draw ? 1 : 0),
    lost: row.lost + (!win && !draw ? 1 : 0),
    goals_for: row.goals_for + goalsFor,
    goals_against: row.goals_against + goalsAgainst,
    points: row.points + (win ? 3 : draw ? 1 : 0),
  }).eq('id', row.id);
}

async function maybeFinalizeLeague(db: Db, leagueId: string) {
  const { count: remaining } = await db
    .from('pm_league_fixtures')
    .select('id', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .neq('status', 'completed');
  if ((remaining ?? 0) > 0) return;

  const { data: league } = await db
    .from('pm_league_instances')
    .select('id, status, prize_pool, name')
    .eq('id', leagueId)
    .maybeSingle()
    .returns<FinalizingLeagueRow>();
  if (!league || league.status === 'completed') return;

  // Lock completion (optimistic) before paying out.
  const { data: locked } = await db
    .from('pm_league_instances')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', leagueId)
    .eq('status', 'in_progress')
    .select('id');
  if (!locked || locked.length === 0) return;

  const { data: standings } = await db
    .from('pm_league_participants')
    .select('team_id, points, goals_for, goals_against')
    .eq('league_id', leagueId)
    .returns<TeamStanding[]>();
  const sorted = (standings ?? []).sort((a, b) =>
    b.points - a.points
    || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)
    || b.goals_for - a.goals_for,
  );
  const champion = sorted[0];
  const prize = Number(league.prize_pool ?? 0);
  if (champion && prize > 0) {
    await db.rpc('pm_credit', { p_team_id: champion.team_id, p_amount: prize, p_reason: 'league_winner' });
    await db.rpc('pm_log_event', {
      p_team_id: champion.team_id,
      p_category: 'finance',
      p_title: `${league.name} მოიგე!`,
      p_detail: `+${formatGel(prize)}`,
      p_accent: 'gold',
    });
  }

  // Promotion / relegation: the champion climbs one division (toward A=1), the
  // last-placed team drops one (toward D=4). Clamped to [1,4]. Round-robin only
  // (this fn isn't called for knockout euro tournaments).
  if (sorted.length >= 2) {
    const last = sorted[sorted.length - 1];
    await movePromotion(db, champion.team_id, 'promote', league.name);
    await movePromotion(db, last.team_id, 'relegate', league.name);
  }
}

async function movePromotion(db: Db, teamId: string, dir: 'promote' | 'relegate', leagueName: string) {
  const { data: team } = await db.from('pm_teams').select('division_id').eq('id', teamId).maybeSingle();
  if (!team) return;
  const current = team.division_id;
  const next = dir === 'promote' ? Math.max(1, current - 1) : Math.min(4, current + 1);
  if (next === current) return; // already at the boundary (A can't promote, D can't relegate)
  await db.from('pm_teams').update({ division_id: next }).eq('id', teamId);
  const divLabel = ['', 'A', 'B', 'C', 'D'];
  await db.rpc('pm_log_event', {
    p_team_id: teamId,
    p_category: 'board',
    p_title: dir === 'promote' ? 'დივიზიონში ახვევა! 🔼' : 'დივიზიონიდან ჩავარდნა 🔽',
    p_detail: `${leagueName} · ${divLabel[current] ?? current} → ${divLabel[next] ?? next} დივიზიონი`,
    p_accent: dir === 'promote' ? 'green' : 'red',
  });
}

// ── Loaders (mirror cups.ts) ─────────────────────────────────────────────────

async function loadTeamRows(teamId: string): Promise<PlayerRow[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('pm_squads')
    .select('shirt_number, position, player:pm_players(primary_position, ovr_current, fatigue, morale, injury_matches, status, card_stats, skill_moves, behavioral, traits, weak_foot)')
    .eq('team_id', teamId)
    .order('shirt_number', { ascending: true })
    .returns<PlayerRow[]>();
  return data || [];
}

async function loadStaffBonuses(teamId: string) {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('pm_staff')
    .select('role_key, level')
    .eq('team_id', teamId)
    .returns<Array<{ role_key: StaffRoleKey; level: number }>>();
  const rows = data ?? [];
  const bonuses = getStaffBonuses(rows.map((row) => ({ roleKey: row.role_key, level: row.level })));
  const assistantLevel = rows
    .filter((row) => row.role_key === 'head_coach')
    .reduce((max, row) => Math.max(max, row.level ?? 0), 0);
  return { setPiecePct: bonuses.setPiecePct, readinessFlat: bonuses.readinessFlat, assistantLevel };
}

async function loadSettings(teamId: string): Promise<MatchSettings> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('pm_match_settings')
    .select('tactical_style, defensive_line, tempo, focus_side')
    .eq('team_id', teamId)
    .maybeSingle();
  return {
    tacticalStyle: (data?.tactical_style ?? 'balanced') as MatchSettings['tacticalStyle'],
    defensiveLine: (data?.defensive_line ?? 'mid') as MatchSettings['defensiveLine'],
    tempo: (data?.tempo ?? 'balanced') as MatchSettings['tempo'],
    focusSide: (data?.focus_side ?? 'center') as MatchSettings['focusSide'],
  };
}
