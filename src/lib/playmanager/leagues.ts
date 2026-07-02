import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatGel } from '@/lib/playmanager/economy';
import { buildMatchProfile, simulateMatch } from '@/lib/playmanager/match-engine';
import { getStaffBonuses, type StaffRoleKey } from '@/lib/playmanager/staff';
import { generateSingleElimBracket } from '@/lib/tournament/generate-bracket';

export type LeagueFormat = 'round_robin' | 'knockout';

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
  const db = createSupabaseAdminClient() as any;
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
  return { success: true as const, leagueId: (data as { id: string }).id };
}

export async function joinLeague(teamId: string, leagueId: string) {
  const db = createSupabaseAdminClient() as any;

  const { data: league } = await db
    .from('pm_league_instances')
    .select('id, status, max_teams')
    .eq('id', leagueId)
    .maybeSingle();
  if (!league) return { success: false as const, error: 'league_not_found' };
  if ((league as any).status !== 'registration') return { success: false as const, error: 'registration_closed' };

  const { count } = await db
    .from('pm_league_participants')
    .select('id', { count: 'exact', head: true })
    .eq('league_id', leagueId);
  if ((count ?? 0) >= (league as any).max_teams) return { success: false as const, error: 'league_full' };

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
  const db = createSupabaseAdminClient() as any;

  const { data: league } = await db
    .from('pm_league_instances')
    .select('id, status, format')
    .eq('id', leagueId)
    .maybeSingle();
  if (!league) return { success: false as const, error: 'league_not_found' };
  if ((league as any).status !== 'registration') return { success: false as const, error: 'already_started' };

  const { data: participants } = await db
    .from('pm_league_participants')
    .select('team_id')
    .eq('league_id', leagueId);
  const teamIds = ((participants ?? []) as { team_id: string }[]).map((p) => p.team_id);
  if (teamIds.length < 2) return { success: false as const, error: 'not_enough_teams' };

  // Optimistic lock: only the caller that flips registration→in_progress builds fixtures.
  const { data: locked } = await db
    .from('pm_league_instances')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', leagueId)
    .eq('status', 'registration')
    .select('id');
  if (!locked || (locked as unknown[]).length === 0) return { success: false as const, error: 'already_started' };

  const now = Date.now();
  let rows: Record<string, unknown>[];

  if ((league as any).format === 'knockout') {
    const { data: teamRows } = await db.from('pm_teams').select('id, name').in('id', teamIds);
    const nameById = new Map<string, string>(((teamRows ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]));
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

export async function processDueLeagueMatches() {
  const db = createSupabaseAdminClient() as any;

  const { data: dueMatches } = await db
    .from('pm_league_fixtures')
    .select('*')
    .eq('status', 'ready')
    .lte('start_time', new Date().toISOString())
    .order('round', { ascending: true });
  if (!dueMatches || (dueMatches as unknown[]).length === 0) return;

  const leagueIds = Array.from(new Set((dueMatches as any[]).map((m) => m.league_id as string)));
  const { data: instances } = await db
    .from('pm_league_instances')
    .select('id, format, prize_pool, name')
    .in('id', leagueIds);
  const instanceById = new Map<string, any>(((instances ?? []) as any[]).map((i) => [i.id, i]));

  const roundRobinAffected = new Set<string>();

  for (const match of dueMatches as any[]) {
    const homeId = match.home_team_id as string | null;
    const awayId = match.away_team_id as string | null;
    if (!homeId || !awayId) continue; // bracket slot not filled yet

    // Atomically claim the fixture (ready → processing). A racing processor gets
    // no rows and skips — prevents double standings, double XP, double prize.
    const { data: claimed } = await db
      .from('pm_league_fixtures')
      .update({ status: 'processing' })
      .eq('id', match.id)
      .eq('status', 'ready')
      .select('id');
    if (!claimed || (claimed as unknown[]).length === 0) continue;

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
      await propagateKnockout(db, instance, match, winnerId as string);
    } else {
      await Promise.all([
        applyStanding(db, match.league_id, homeId, homeGoals, awayGoals),
        applyStanding(db, match.league_id, awayId, awayGoals, homeGoals),
      ]);
      roundRobinAffected.add(match.league_id as string);
    }
  }

  for (const leagueId of roundRobinAffected) {
    await maybeFinalizeLeague(db, leagueId);
  }
}

// Knockout: advance the winner into the next round's slot; if there is no next
// match this was the final → complete the tournament and pay the champion.
async function propagateKnockout(db: any, instance: any, match: any, winnerId: string) {
  const nextRound = (match.round as number) + 1;
  const nextPosition = Math.ceil((match.position as number) / 2);
  const isHomeSlot = (match.position as number) % 2 !== 0;

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

  const update: Record<string, unknown> = isHomeSlot
    ? { home_team_id: winnerId }
    : { away_team_id: winnerId };
  const otherSlot = isHomeSlot ? (nextMatch as any).away_team_id : (nextMatch as any).home_team_id;
  if (otherSlot) update.status = 'ready';
  await db.from('pm_league_fixtures').update(update).eq('id', (nextMatch as any).id);
}

async function applyStanding(
  db: any,
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
    played: (row as any).played + 1,
    won: (row as any).won + (win ? 1 : 0),
    drawn: (row as any).drawn + (draw ? 1 : 0),
    lost: (row as any).lost + (!win && !draw ? 1 : 0),
    goals_for: (row as any).goals_for + goalsFor,
    goals_against: (row as any).goals_against + goalsAgainst,
    points: (row as any).points + (win ? 3 : draw ? 1 : 0),
  }).eq('id', (row as any).id);
}

async function maybeFinalizeLeague(db: any, leagueId: string) {
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
    .maybeSingle();
  if (!league || (league as any).status === 'completed') return;

  // Lock completion (optimistic) before paying out.
  const { data: locked } = await db
    .from('pm_league_instances')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', leagueId)
    .eq('status', 'in_progress')
    .select('id');
  if (!locked || (locked as unknown[]).length === 0) return;

  const { data: standings } = await db
    .from('pm_league_participants')
    .select('team_id, points, goals_for, goals_against')
    .eq('league_id', leagueId);
  const sorted = ((standings ?? []) as any[]).sort((a, b) =>
    b.points - a.points
    || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)
    || b.goals_for - a.goals_for,
  );
  const champion = sorted[0];
  const prize = Number((league as any).prize_pool ?? 0);
  if (champion && prize > 0) {
    await db.rpc('pm_credit', { p_team_id: champion.team_id, p_amount: prize, p_reason: 'league_winner' });
    await db.rpc('pm_log_event', {
      p_team_id: champion.team_id,
      p_category: 'finance',
      p_title: `${(league as any).name} მოიგე!`,
      p_detail: `+${formatGel(prize)}`,
      p_accent: 'gold',
    });
  }

  // Promotion / relegation: the champion climbs one division (toward A=1), the
  // last-placed team drops one (toward D=4). Clamped to [1,4]. Round-robin only
  // (this fn isn't called for knockout euro tournaments).
  if (sorted.length >= 2) {
    const last = sorted[sorted.length - 1];
    await movePromotion(db, champion.team_id, 'promote', (league as any).name);
    await movePromotion(db, last.team_id, 'relegate', (league as any).name);
  }
}

async function movePromotion(db: any, teamId: string, dir: 'promote' | 'relegate', leagueName: string) {
  const { data: team } = await db.from('pm_teams').select('division_id').eq('id', teamId).maybeSingle();
  if (!team) return;
  const current = Number((team as any).division_id ?? 4);
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

async function loadTeamRows(teamId: string) {
  const db = createSupabaseAdminClient() as any;
  const { data } = await db
    .from('pm_squads')
    .select('shirt_number, position, player:pm_players(primary_position, ovr_current, fatigue, morale, injury_matches, status, card_stats, skill_moves)')
    .eq('team_id', teamId)
    .order('shirt_number', { ascending: true });
  return data || [];
}

async function loadStaffBonuses(teamId: string) {
  const db = createSupabaseAdminClient() as any;
  const { data } = await db
    .from('pm_staff')
    .select('role_key, level')
    .eq('team_id', teamId);
  const rows: Array<{ role_key: StaffRoleKey; level: number }> = data ?? [];
  const bonuses = getStaffBonuses(rows.map((row) => ({ roleKey: row.role_key, level: row.level })));
  const assistantLevel = rows
    .filter((row) => row.role_key === 'head_coach')
    .reduce((max, row) => Math.max(max, row.level ?? 0), 0);
  return { setPiecePct: bonuses.setPiecePct, readinessFlat: bonuses.readinessFlat, assistantLevel };
}

async function loadSettings(teamId: string) {
  const db = createSupabaseAdminClient() as any;
  const { data } = await db
    .from('pm_match_settings')
    .select('tactical_style, defensive_line, tempo, focus_side')
    .eq('team_id', teamId)
    .maybeSingle();
  return {
    tacticalStyle: data?.tactical_style ?? 'balanced',
    defensiveLine: data?.defensive_line ?? 'mid',
    tempo: data?.tempo ?? 'balanced',
    focusSide: data?.focus_side ?? 'center',
  };
}
