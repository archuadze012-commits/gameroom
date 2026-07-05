'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  getActionContext,
  getAuthenticatedTeam,
  playManagerActionLimited,
  RATE_LIMITED_RESULT,
  getXpRewardWithTrainingBonus,
  applyPostActionRewards,
  logPlayManagerEvent,
  mapPlayerActionError,
  type PlayManagerPlayerActionResult,
} from './action-helpers';

type TrainPlayerRpcResult = {
  playerId: string;
  ovrCurrent: number;
  currentTransferValueGel: number;
  fatigue: number;
  morale: number;
  ovrGain?: number;
  statGain?: number;
  improvedStats?: string[];
  pendingOvr?: number;
  upgradable?: boolean;
  xpGranted?: number;
  xpBanked?: number;
  staffTrainingBonusPct?: number;
  matchesPlayed?: number;
};

export async function trainPlayManagerPlayer(playerId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (playManagerActionLimited(user.id, 'dev')) return RATE_LIMITED_RESULT;

  const db = createSupabaseAdminClient();
  const actionContext = await getActionContext(user.id, team.id);
  const { data: rawData, error } = await db.rpc('pm_train_player', {
    p_team_id: team.id,
    p_player_id: playerId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as TrainPlayerRpcResult | null;

  if (error) return mapPlayerActionError(error.message);
  const xpReward = getXpRewardWithTrainingBonus(18, actionContext.bonuses.trainingXpPct, true);
  await applyPostActionRewards({
    userId: user.id,
    teamId: team.id,
    xpReward,
  });
  // Training no longer raises OVR directly, and no longer grants a guaranteed
  // free stat point — it banks a session's worth of development XP into the
  // SAME budget/cost curve match development uses (pm_players.xp), so a
  // session often just accumulates toward the next point rather than buying
  // one outright. This is deliberate: training used to be far faster than
  // playing matches for the same pending-stat pipeline.
  const statGain = Math.max(0, data?.statGain ?? 0);
  const pendingOvr = data?.pendingOvr;
  const upgradable = data?.upgradable === true;
  const devXpGranted = data?.xpGranted;
  const devXpBanked = data?.xpBanked;
  const managerXpReward = xpReward; // profiles.xp (manager level) — a separate pool from player dev XP.
  // Training is now one session per player per league match, so there is no
  // team-wide session counter to surface — the next session unlocks after the
  // next matchday.
  const sessionsLabel = ' · შემდეგი სესია მატჩის შემდეგ';
  const pendingLabel = pendingOvr != null ? ` · pending OVR ${pendingOvr}${upgradable ? ' ✦' : ''}` : '';
  const devLabel =
    statGain > 0
      ? `მინი-სტატი +${statGain}`
      : devXpGranted != null && devXpBanked != null
        ? `+${devXpGranted} dev XP (${devXpBanked} დაგროვილი)`
        : 'ვარჯიში ჩატარდა';
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: statGain > 0 ? 'ვარჯიში: მინი-სტატები გაუმჯობესდა' : 'ვარჯიში: XP დაგროვდა',
    detail: `${devLabel} · მენეჯერის XP +${managerXpReward}${pendingLabel}${sessionsLabel}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: upgradable
      ? `${devLabel}${pendingLabel} — ასაწევია ასისტენტთან fodder-ით${sessionsLabel}`
      : `${devLabel}${pendingLabel}${sessionsLabel}`,
    improvedStats: statGain > 0 ? data?.improvedStats : undefined,
    devXpGranted: statGain === 0 ? devXpGranted : undefined,
  };
}

export async function openPlayManagerPack(packId: number): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (playManagerActionLimited(user.id, 'dev')) return RATE_LIMITED_RESULT;

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_open_pack', {
    p_team_id: team.id,
    p_pack_id: packId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { count: number; cost: number; received: string[] } | null;
  if (error) return mapPlayerActionError(error.message);

  const receivedIds = Array.isArray(data?.received) ? data.received : [];
  let players: unknown[] = [];
  if (receivedIds.length > 0) {
    const { data: cards } = await db
      .from('pm_players')
      .select('id,display_name,ovr_current,talent,primary_position,nationality_code,card_image_url')
      .in('id', receivedIds);
    // Preserve draw order from the RPC's received array.
    const byId = new Map((cards ?? []).map((c) => [c.id, c]));
    players = receivedIds.map((id) => byId.get(id)).filter(Boolean);
  }

  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'gold',
    title: 'პაკი გაიხსნა',
    detail: `${data?.count ?? 0} ბარათი${(data?.cost ?? 0) > 0 ? ` · -${(data?.cost ?? 0).toLocaleString('ka-GE')} ₾` : ''}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `პაკი გაიხსნა · ${data?.count ?? 0} ბარათი`,
    amount: -(data?.cost ?? 0),
    players,
  };
}

export async function confirmPlayManagerOvrUpgrade(
  playerId: string,
  fodderIds: string[],
): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (playManagerActionLimited(user.id, 'dev')) return RATE_LIMITED_RESULT;

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc(
    'pm_confirm_ovr_upgrade',
    { p_team_id: team.id, p_player_id: playerId, p_fodder_ids: fodderIds },
  );
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { oldOvr: number; newOvr: number; fodderConsumed: number } | null;
  if (error) return mapPlayerActionError(error.message);

  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: 'OVR აფგრეიდი დადასტურდა',
    detail: `OVR ${data?.oldOvr} → ${data?.newOvr} · ${data?.fodderConsumed} Pro ბარათი შეიწირა`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `OVR ${data?.oldOvr} → ${data?.newOvr} · ${data?.fodderConsumed} Pro ბარათი`,
  };
}

export async function buyPlayManagerXpPack(pack: 'starter' | 'prep' | 'elite'): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (playManagerActionLimited(user.id, 'dev')) return RATE_LIMITED_RESULT;

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_buy_xp_pack', {
    p_team_id: team.id,
    p_pack: pack,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { xp: number; price: number; newXp: number } | null;

  if (error) {
    if (error.message.includes('invalid_pack')) return { success: false, error: 'unavailable' };
    return mapPlayerActionError(error.message);
  }
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: `XP პაკეტი შეძენილია · +${(data?.xp ?? 0).toLocaleString('ka-GE')} XP`,
    detail: `-${(data?.price ?? 0).toLocaleString('ka-GE')} ₾`,
  });
  revalidatePath('/playmanager/training');
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `+${(data?.xp ?? 0).toLocaleString('ka-GE')} XP`,
    amount: data?.price ?? 0,
  };
}
