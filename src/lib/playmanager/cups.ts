import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateSingleElimBracket } from '@/lib/tournament/generate-bracket';
import { formatGel } from '@/lib/playmanager/economy';
import { buildMatchProfile, simulateMatch, type MatchSettings, type PlayerRow } from '@/lib/playmanager/match-engine';
import { getStaffBonuses, type StaffRoleKey } from '@/lib/playmanager/staff';

type ParticipantWithTeamRow = {
  team_id: string;
  pm_teams: { name: string } | { name: string }[] | null;
};

type StaleCupRow = {
  id: string;
  created_at: string | null;
  pm_cup_templates: { id: string; schedule_type: string; max_teams: number } | { id: string; schedule_type: string; max_teams: number }[] | null;
  pm_cup_participants: { team_id: string }[] | null;
};

type DueCupMatchRow = {
  id: string;
  cup_instance_id: string | null;
  round: number;
  position: number;
  team1_id: string | null;
  team2_id: string | null;
};

type CupTemplateRel = { id: string; name: string; prize_pool: number } | { id: string; name: string; prize_pool: number }[] | null;

type CupInstanceWithTemplateRow = {
  template_id: string | null;
  pm_cup_templates: CupTemplateRel;
};

function firstRel<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export async function joinPlayManagerCup(teamId: string, cupInstanceId: string) {
  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_join_cup', {
    p_team_id: teamId,
    p_cup_instance_id: cupInstanceId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // jsonb return — narrow to the RPC's known result contract.
  const result = rawData as unknown as { success: boolean; error?: string; cup_started?: boolean };
  if (!result.success) {
    return result;
  }

  // If the cup started, we need to generate the bracket right away
  if (result.cup_started) {
    await generateCupBracket(cupInstanceId);
  }

  return { success: true };
}

export async function generateCupBracket(cupInstanceId: string) {
  const db = createSupabaseAdminClient();

  // 1. Get all participants
  const { data: participants } = await db
    .from('pm_cup_participants')
    .select('team_id, pm_teams(name)')
    .eq('cup_instance_id', cupInstanceId)
    .returns<ParticipantWithTeamRow[]>();

  if (!participants || participants.length === 0) return;

  // We assign random seeds for the bracket
  const shuffled = participants
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

  const bracketParticipants = shuffled.map((p, index) => ({
    id: p.team_id,
    name: firstRel(p.pm_teams)?.name || 'Unknown',
    seed: index + 1,
  }));

  const { matches } = generateSingleElimBracket(bracketParticipants);

  // Calculate start times. Round 1 starts in 10 minutes. Round 2 in 20. Round 3 in 30.
  const now = new Date();
  
  const dbMatches = matches.map(m => {
    const startTime = new Date(now.getTime() + m.round * 10 * 60000);
    return {
      cup_instance_id: cupInstanceId,
      round: m.round,
      position: m.position,
      team1_id: m.player1?.id || null,
      team2_id: m.player2?.id || null,
      winner_id: m.winner?.id || null,
      status: m.status || 'pending',
      start_time: startTime.toISOString(),
    };
  });

  await db.from('pm_cup_matches').insert(dbMatches);
}

// No bots (user decision): after 20 min a registration cup auto-starts with
// whatever REAL teams registered (>= 2), generates its bracket, and spawns a
// fresh registration instance so the cup type stays open. Cups with < 2 real
// teams keep waiting.
export async function checkAndStartStaleCups() {
  const db = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();

  const { data: staleCups } = await db
    .from('pm_cup_instances')
    .select('*, pm_cup_templates(id, schedule_type, max_teams), pm_cup_participants(team_id)')
    .eq('status', 'registration')
    .lt('created_at', cutoff)
    .returns<StaleCupRow[]>();

  if (!staleCups || staleCups.length === 0) return;

  for (const cup of staleCups) {
    const template = firstRel(cup.pm_cup_templates);
    if (!template || template.schedule_type !== 'auto_fill') continue;

    const participants = cup.pm_cup_participants || [];
    if (participants.length < 2) continue; // wait for at least 2 real teams — never bot-fill

    // Claim this cup (optimistic lock) and start it with the real participants.
    const { data: updatedCup } = await db
      .from('pm_cup_instances')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', cup.id)
      .eq('status', 'registration')
      .select();

    if (!updatedCup || updatedCup.length === 0) {
      continue; // Already processed by another request
    }

    // Keep the cup type open for the next cohort.
    await db.from('pm_cup_instances').insert({
      template_id: template.id,
      status: 'registration',
    });

    await generateCupBracket(cup.id);
  }
}

// Lazy evaluation: call this whenever someone opens the league center
// A cup match claimed but not completed within this window is treated as
// stranded (its processor died) and reset to 'ready' so the next run retries it.
const STALE_CLAIM_MS = 2 * 60 * 1000;

export async function processDueCupMatches() {
  const db = createSupabaseAdminClient();

  // Auto-start stale cups with real teams only (no bots)
  await checkAndStartStaleCups();

  // Recover matches stranded in 'processing' (crashed mid-simulate). The
  // completion write is atomic, so a stranded row has no partial result —
  // 'ready' is a clean state to return it to.
  const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
  await db
    .from('pm_cup_matches')
    .update({ status: 'ready', claimed_at: null })
    .eq('status', 'processing')
    .or(`claimed_at.lt.${staleBefore},claimed_at.is.null`);

  // Find matches that are 'ready' and past their start_time
  const { data: dueMatches } = await db
    .from('pm_cup_matches')
    .select('id, cup_instance_id, round, position, team1_id, team2_id')
    .eq('status', 'ready')
    .lte('start_time', new Date().toISOString())
    .order('round', { ascending: true })
    .returns<DueCupMatchRow[]>();

  if (!dueMatches || dueMatches.length === 0) return;

  for (const match of dueMatches) {
    // Atomically claim this fixture (ready → processing). If another concurrent
    // processor already grabbed it, the guarded update returns no rows and we
    // skip — prevents double-simulation, double XP, and double prize payout.
    const { data: claimed } = await db
      .from('pm_cup_matches')
      .update({ status: 'processing', claimed_at: new Date().toISOString() })
      .eq('id', match.id)
      .eq('status', 'ready')
      .select('id');
    if (!claimed || (claimed as unknown[]).length === 0) continue;

    const team1Id = match.team1_id!;
    const team2Id = match.team2_id!;
    const [team1Rows, team2Rows, team1Settings, team2Settings, team1Bonuses, team2Bonuses] = await Promise.all([
      loadCupTeamRows(team1Id),
      loadCupTeamRows(team2Id),
      loadCupSettings(team1Id),
      loadCupSettings(team2Id),
      loadCupStaffBonuses(team1Id),
      loadCupStaffBonuses(team2Id),
    ]);

    const simulated = simulateMatch(
      team1Id,
      buildMatchProfile(team1Rows, team1Settings, team1Bonuses),
      team2Id,
      buildMatchProfile(team2Rows, team2Settings, team2Bonuses),
    );
    const team1Score = simulated.score1;
    const team2Score = simulated.score2;
    const isTeam1Winner = simulated.winnerId === team1Id;
    const winnerId = simulated.winnerId;

    // Update this match
    await db.from('pm_cup_matches').update({
      score1: team1Score,
      score2: team2Score,
      winner_id: winnerId,
      status: 'completed',
    }).eq('id', match.id);

    // Both line-ups earn development XP for playing this cup match (Phase 3).
    await Promise.all([
      db.rpc('pm_grant_match_development', { p_team_id: team1Id }),
      db.rpc('pm_grant_match_development', { p_team_id: team2Id }),
    ]);

    // Propagate winner to next round
    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const isPlayer1InNext = match.position % 2 !== 0; // Odd positions go to player1 slot
    
    const { data: nextMatchData } = await db
      .from('pm_cup_matches')
      .select('id, team1_id, team2_id')
      .eq('cup_instance_id', match.cup_instance_id!)
      .eq('round', nextRound)
      .eq('position', nextPosition)
      .single();

    if (nextMatchData) {
      const updateData: { team1_id?: string; team2_id?: string; status?: string } = {};
      if (isPlayer1InNext) {
        updateData.team1_id = winnerId;
      } else {
        updateData.team2_id = winnerId;
      }

      // If both slots are now filled, status becomes ready
      const otherTeamId = isPlayer1InNext ? nextMatchData.team2_id : nextMatchData.team1_id;
      if (otherTeamId) {
        updateData.status = 'ready';
      }

      await db.from('pm_cup_matches').update(updateData).eq('id', nextMatchData.id);
    } else {
      // No next match means this was the final!
      await distributeCupPrizes(match.cup_instance_id!, winnerId, isTeam1Winner ? team2Id : team1Id);
    }
  }
}

async function loadCupTeamRows(teamId: string): Promise<PlayerRow[]> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('pm_squads')
    .select('shirt_number, position, player:pm_players(primary_position, ovr_current, fatigue, morale, injury_matches, status, card_stats, skill_moves, behavioral, traits, weak_foot)')
    .eq('team_id', teamId)
    .order('shirt_number', { ascending: true })
    .returns<PlayerRow[]>();

  return data || [];
}

// Staff bonuses that feed the cup match engine — mirrors the league SQL
// (set_piece_coach amplifies set-piece threat, head_coach lifts readiness and
// drives auto-lineup repair).
async function loadCupStaffBonuses(teamId: string) {
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

async function loadCupSettings(teamId: string): Promise<MatchSettings> {
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

async function distributeCupPrizes(cupInstanceId: string, winnerId: string, runnerUpId: string) {
  const db = createSupabaseAdminClient();

  // Optimistic lock: only the first caller to flip in_progress → completed pays
  // the prize. A racing processor gets no rows back and returns without paying.
  const { data: lockedInstance } = await db
    .from('pm_cup_instances')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', cupInstanceId)
    .eq('status', 'in_progress')
    .select('id');
  if (!lockedInstance || lockedInstance.length === 0) return;

  // Get template info for prizes
  const { data: instance } = await db
    .from('pm_cup_instances')
    .select('template_id, pm_cup_templates(*)')
    .eq('id', cupInstanceId)
    .single()
    .returns<CupInstanceWithTemplateRow>();

  const template = instance ? firstRel(instance.pm_cup_templates) : null;
  if (!template) return;

  const prizePool = Number(template.prize_pool ?? 0);
  if (prizePool <= 0) return;

  if (template.id === 'champions_cup') {
    // 75-25 split
    const winnerPrize = Math.floor(prizePool * 0.75);
    const runnerUpPrize = prizePool - winnerPrize;

    await db.rpc('pm_credit', { p_team_id: winnerId, p_amount: winnerPrize, p_reason: 'cup_winner' });
    await db.rpc('pm_log_event', { p_team_id: winnerId, p_category: 'finance', p_title: `ჩემპიონთა თასი მოიგეთ!`, p_detail: `+${formatGel(winnerPrize)}`, p_accent: 'gold' });

    await db.rpc('pm_credit', { p_team_id: runnerUpId, p_amount: runnerUpPrize, p_reason: 'cup_runner_up' });
    await db.rpc('pm_log_event', { p_team_id: runnerUpId, p_category: 'finance', p_title: `ჩემპიონთა თასის ფინალისტი`, p_detail: `+${formatGel(runnerUpPrize)}`, p_accent: 'gold' });
  } else {
    // Winner takes all for normal cups
    await db.rpc('pm_credit', { p_team_id: winnerId, p_amount: prizePool, p_reason: 'cup_winner' });
    await db.rpc('pm_log_event', { p_team_id: winnerId, p_category: 'finance', p_title: `${template.name} მოიგეთ!`, p_detail: `+${formatGel(prizePool)}`, p_accent: 'gold' });
  }
}
