import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateSingleElimBracket } from '@/lib/tournament/generate-bracket';
import { formatGel } from '@/lib/playmanager/economy';
import { buildMatchProfile, simulateMatch } from '@/lib/playmanager/match-engine';
import { getStaffBonuses, type StaffRoleKey } from '@/lib/playmanager/staff';

export async function joinPlayManagerCup(teamId: string, cupInstanceId: string) {
  const db = createSupabaseAdminClient() as any;
  const { data, error } = await db.rpc('pm_join_cup', {
    p_team_id: teamId,
    p_cup_instance_id: cupInstanceId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string; cup_started?: boolean };
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
  const db = createSupabaseAdminClient() as any;
  
  // 1. Get all participants
  const { data: participants } = await db
    .from('pm_cup_participants')
    .select('team_id, pm_teams(name)')
    .eq('cup_instance_id', cupInstanceId);

  if (!participants || participants.length === 0) return;

  // We assign random seeds for the bracket
  const shuffled = participants
    .map((value: any) => ({ value, sort: Math.random() }))
    .sort((a: any, b: any) => a.sort - b.sort)
    .map(({ value }: any) => value);

  const bracketParticipants = shuffled.map((p: any, index: number) => ({
    id: p.team_id!,
    name: p.pm_teams?.name || 'Unknown',
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

export async function checkAndFillStaleCupsWithBots() {
  const db = createSupabaseAdminClient() as any;
  const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();

  // Find all cup instances in registration status created more than 20 minutes ago
  const { data: staleCups } = await db
    .from('pm_cup_instances')
    .select('*, pm_cup_templates(id, schedule_type, max_teams), pm_cup_participants(team_id)')
    .eq('status', 'registration')
    .lt('created_at', cutoff);

  if (!staleCups || staleCups.length === 0) return;

  for (const cup of staleCups) {
    const template = cup.pm_cup_templates;
    if (!template || template.schedule_type !== 'auto_fill') continue;

    // Try to claim this cup by setting status to in_progress (optimistic lock)
    const { data: updatedCup } = await db
      .from('pm_cup_instances')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', cup.id)
      .eq('status', 'registration')
      .select();

    if (!updatedCup || updatedCup.length === 0) {
      continue; // Already processed by another request
    }

    const participants = cup.pm_cup_participants || [];
    const maxTeams = template.max_teams || 8;
    const currentCount = participants.length;

    if (currentCount < maxTeams) {
      const needed = maxTeams - currentCount;
      const currentTeamIds = participants.map((p: any) => p.team_id);

      // Select random bots that are not already in this cup
      let botQuery = db
        .from('pm_teams')
        .select('id')
        .eq('is_bot', true);

      if (currentTeamIds.length > 0) {
        botQuery = botQuery.not('id', 'in', `(${currentTeamIds.join(',')})`);
      }

      const { data: botTeams } = await botQuery.limit(needed);

      if (botTeams && botTeams.length > 0) {
        const inserts = botTeams.map((bot: any) => ({
          cup_instance_id: cup.id,
          team_id: bot.id,
        }));
        await db.from('pm_cup_participants').insert(inserts);
      }
    }

    // Spawn new instance so others can register
    await db.from('pm_cup_instances').insert({
      template_id: template.id,
      status: 'registration'
    });

    // Generate bracket for this cup
    await generateCupBracket(cup.id);
  }
}

// Lazy evaluation: call this whenever someone opens the league center
export async function processDueCupMatches() {
  const db = createSupabaseAdminClient() as any;
  
  // Check and fill stale cups with bots
  await checkAndFillStaleCupsWithBots();
  
  // Find matches that are 'ready' and past their start_time
  const { data: dueMatches } = await (createSupabaseAdminClient() as any)
    .from('pm_cup_matches')
    .select('*, pm_cup_instances(template_id, pm_cup_templates(prize_pool))')
    .eq('status', 'ready')
    .lte('start_time', new Date().toISOString())
    .order('round', { ascending: true }) as any;

  if (!dueMatches || dueMatches.length === 0) return;

  for (const match of dueMatches) {
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

    // Propagate winner to next round
    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const isPlayer1InNext = match.position % 2 !== 0; // Odd positions go to player1 slot
    
    const { data: nextMatchData } = await db
      .from('pm_cup_matches')
      .select('*')
      .eq('cup_instance_id', match.cup_instance_id!)
      .eq('round', nextRound)
      .eq('position', nextPosition)
      .single();

    if (nextMatchData) {
      const updateData: any = {};
      if (isPlayer1InNext) {
        updateData.team1_id = winnerId;
      } else {
        updateData.team2_id = winnerId;
      }
      
      // If both slots are now filled, status becomes ready
      const otherTeamId = isPlayer1InNext ? (nextMatchData as any).team2_id : (nextMatchData as any).team1_id;
      if (otherTeamId) {
        updateData.status = 'ready';
      }

      await db.from('pm_cup_matches').update(updateData).eq('id', (nextMatchData as any).id);
    } else {
      // No next match means this was the final!
      await distributeCupPrizes(match.cup_instance_id!, winnerId, isTeam1Winner ? team2Id : team1Id);
    }
  }
}

async function loadCupTeamRows(teamId: string) {
  const db = createSupabaseAdminClient() as any;
  const { data } = await db
    .from('pm_squads')
    .select('shirt_number, position, player:pm_players(primary_position, ovr_current, fatigue, morale, injury_matches, status, card_stats)')
    .eq('team_id', teamId)
    .order('shirt_number', { ascending: true });

  return data || [];
}

// Staff bonuses that feed the cup match engine — mirrors the league SQL
// (set_piece_coach amplifies set-piece threat, head_coach lifts readiness and
// drives auto-lineup repair).
async function loadCupStaffBonuses(teamId: string) {
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

async function loadCupSettings(teamId: string) {
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

async function distributeCupPrizes(cupInstanceId: string, winnerId: string, runnerUpId: string) {
  const db = createSupabaseAdminClient() as any;
  
  // Mark cup as completed
  await db.from('pm_cup_instances').update({
    status: 'completed',
    completed_at: new Date().toISOString()
  }).eq('id', cupInstanceId);

  // Get template info for prizes
  const { data: instance } = await db
    .from('pm_cup_instances')
    .select('template_id, pm_cup_templates(*)')
    .eq('id', cupInstanceId)
    .single();

  if (!instance || !(instance as any).pm_cup_templates) return;

  const template = (instance as any).pm_cup_templates;
  
  if (template.id === 'champions_cup') {
    // 75-25 split
    const winnerPrize = Math.floor(template.prize_pool! * 0.75);
    const runnerUpPrize = template.prize_pool! - winnerPrize;
    
    await db.rpc('pm_credit', { p_team_id: winnerId, p_amount: winnerPrize, p_reason: 'cup_winner' });
    await db.rpc('pm_log_event', { p_team_id: winnerId, p_category: 'finance', p_title: `ჩემპიონთა თასი მოიგეთ!`, p_detail: `+${formatGel(winnerPrize)}`, p_accent: 'gold' });

    await db.rpc('pm_credit', { p_team_id: runnerUpId, p_amount: runnerUpPrize, p_reason: 'cup_runner_up' });
    await db.rpc('pm_log_event', { p_team_id: runnerUpId, p_category: 'finance', p_title: `ჩემპიონთა თასის ფინალისტი`, p_detail: `+${formatGel(runnerUpPrize)}`, p_accent: 'gold' });
  } else {
    // Winner takes all for normal cups
    await db.rpc('pm_credit', { p_team_id: winnerId, p_amount: template.prize_pool!, p_reason: 'cup_winner' });
    await db.rpc('pm_log_event', { p_team_id: winnerId, p_category: 'finance', p_title: `${template.name} მოიგეთ!`, p_detail: `+${formatGel(template.prize_pool!)}`, p_accent: 'gold' });
  }
}
