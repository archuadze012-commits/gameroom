'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getCurrentTransferValueGel } from '@/lib/playmanager/economy';
import { normalizePlayManagerPosition } from '@/lib/playmanager/secondary-positions';
import { MARKET_TARGETS } from '@/lib/playmanager/gameplay';
import {
  applyPostActionRewards,
  advancePlayManagerTime,
  getActionContext,
  getAuthenticatedTeam,
  getPercentBonusAmount,
  logPlayManagerEvent,
  mapPlayerActionError,
  type PlayManagerPlayerActionResult,
} from './action-helpers';

export async function buyPlayManagerMarketPlayer(playerKey: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();

  // The market shows thousands of real DB free agents (keyed by normalized_name),
  // not just the four static seed targets — so resolve the buy against the actual
  // unowned pool. pm_buy_market_player claims the existing row by normalized_name;
  // MARKET_TARGETS stays as a fallback for the seed players.
  const { data: dbRows } = await db
    .from('pm_players')
    .select('normalized_name, display_name, primary_position, is_real, talent, ea_fc_ovr, ovr_base, ovr_current, age, current_transfer_value_gel')
    .eq('normalized_name', playerKey)
    .is('owner_id', null)
    .eq('status', 'active')
    .not('pending_repack', 'is', true)
    .limit(1);
  const dbPlayer = dbRows?.[0] ?? null;
  const target = MARKET_TARGETS.find((player) => player.key === playerKey || player.normalizedName === playerKey);
  if (!dbPlayer && !target) return { success: false, error: 'invalid_player' };

  const price = dbPlayer
    ? Math.max(1, dbPlayer.current_transfer_value_gel ?? getCurrentTransferValueGel(dbPlayer.ovr_current, dbPlayer.ovr_current))
    : getCurrentTransferValueGel(target!.ovr, target!.ovr);
  const displayName = dbPlayer?.display_name || target?.displayName || playerKey;
  const normalizedName = dbPlayer?.normalized_name ?? target!.normalizedName;

  const playerPayload = dbPlayer
    ? {
        normalized_name: dbPlayer.normalized_name,
        display_name: dbPlayer.display_name ?? dbPlayer.normalized_name,
        position: normalizePlayManagerPosition(dbPlayer.primary_position),
        is_real: dbPlayer.is_real ?? true,
        talent: dbPlayer.talent ?? 8,
        ea_fc_ovr: dbPlayer.ea_fc_ovr,
        ovr_source: 'ea_fc',
        ovr_base: dbPlayer.ovr_base ?? dbPlayer.ovr_current,
        ovr_current: dbPlayer.ovr_current,
        age: dbPlayer.age ?? 18,
        current_transfer_value_gel: price,
      }
    : {
        normalized_name: target!.normalizedName,
        display_name: target!.displayName,
        position: target!.position,
        is_real: true,
        talent: 10,
        ea_fc_ovr: target!.ovr,
        ovr_source: 'ea_fc',
        ovr_base: target!.ovr,
        ovr_current: target!.ovr,
        age: target!.age,
        current_transfer_value_gel: price,
      };

  const actionContext = await getActionContext(user.id, team.id);
  const { error } = await db.rpc('pm_buy_market_player', {
    p_team_id: team.id,
    p_player: playerPayload,
  });

  if (error) return mapPlayerActionError(error.message);
  // The discount refund MUST stay strictly below the 15% resale spread
  // (pm_sell_player pays 85% of sticker). A freshly bought market player is
  // stored at full sticker value and instantly resellable, so if the refund
  // ever reached ≥15% a buy→sell round-trip would print money. The manager +
  // market-facility discount can reach 18%+, so clamp it here at 14%.
  const rawRefund = getPercentBonusAmount(price, actionContext.bonuses.transferDiscountPct);
  const refund = Math.min(rawRefund, Math.floor(price * 0.14));
  const xpReward = 18;
  await applyPostActionRewards({
    userId: user.id,
    teamId: team.id,
    xpReward,
    extraCredit: refund,
    creditReason: `market_discount:${normalizedName}`,
  });
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: `${displayName} დაემატა გუნდს`,
    detail: `${price.toLocaleString('ka-GE')} ₾ deal${refund > 0 ? ` · refund ${refund.toLocaleString('ka-GE')} ₾` : ''}${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `${displayName} დაემატა გუნდს${refund > 0 ? ` · discount refund ${refund.toLocaleString('ka-GE')} ₾` : ''} · XP +${xpReward}`,
    amount: -(price - refund),
  };
}

export async function signPlayManagerAcademyProspect(prospectId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const actionContext = await getActionContext(user.id, team.id);
  const { data: rawData, error } = await db.rpc('pm_sign_academy_prospect', {
    p_team_id: team.id,
    p_prospect_id: prospectId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { cost: number } | null;

  if (error) return mapPlayerActionError(error.message);
  const refund = getPercentBonusAmount(data?.cost ?? 0, actionContext.bonuses.transferDiscountPct);
  const xpReward = 16;
  await applyPostActionRewards({
    userId: user.id,
    teamId: team.id,
    xpReward,
    extraCredit: refund,
    creditReason: `academy_discount:${prospectId}`,
  });
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'academy',
    accent: 'green',
    title: 'აკადემიის ტალანტი მთავარ გუნდში გადავიდა',
    detail: `${data?.cost?.toLocaleString('ka-GE') ?? 0} ₾ signing${refund > 0 ? ` · refund ${refund.toLocaleString('ka-GE')} ₾` : ''}${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `ახალგაზრდა ფეხბურთელი აკადემიიდან დაემატა${refund > 0 ? ` · refund ${refund.toLocaleString('ka-GE')} ₾` : ''} · XP +${xpReward}`,
    amount: -((data?.cost ?? 0) - refund),
  };
}

export async function sellPlayManagerPlayer(playerId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_sell_player', {
    p_team_id: team.id,
    p_player_id: playerId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { amount: number } | null;

  if (error) return mapPlayerActionError(error.message);
  const xpReward = 12;
  await applyPostActionRewards({
    userId: user.id,
    teamId: team.id,
    xpReward,
  });
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'red',
    title: 'ფეხბურთელი გაიყიდა',
    detail: `${(data?.amount ?? 0).toLocaleString('ka-GE')} ₾ დაბრუნდა ბიუჯეტში${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: `ფეხბურთელი გაყიდულია · XP +${xpReward}`, amount: data?.amount ?? 0 };
}
