'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { clampTicketPriceGel } from '@/lib/playmanager/economy';
import {
  advancePlayManagerTime,
  getAuthenticatedTeam,
  playManagerActionLimited,
  RATE_LIMITED_RESULT,
  logPlayManagerEvent,
  mapPlayerActionError,
  type PlayManagerPlayerActionResult,
} from './action-helpers';

export async function savePlayManagerTicketPrice(ticketPrice: number): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (await playManagerActionLimited(user.id, 'finance')) return RATE_LIMITED_RESULT;

  // Validate at the boundary: clamp to the allowed range so a crafted request
  // can never send an out-of-range value to the RPC. (DB also enforces 10–80.)
  const safeTicketPrice = clampTicketPriceGel(ticketPrice);

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_save_ticket_price', {
    p_team_id: team.id,
    p_ticket_price: safeTicketPrice,
  });

  if (error) return mapPlayerActionError(error.message);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: 'ბილეთის ფასი განახლდა',
    detail: `${safeTicketPrice.toLocaleString('ka-GE')} ₾`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: 'ბილეთის ფასი შენახულია' };
}

export async function negotiatePlayManagerSponsor(): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (await playManagerActionLimited(user.id, 'finance')) return RATE_LIMITED_RESULT;

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_negotiate_sponsor', {
    p_team_id: team.id,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { sponsorTier: string; sponsorWeeklyAmount: number } | null;

  if (error) return mapPlayerActionError(error.message);
  const calendar = await advancePlayManagerTime(team.id, 1);
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'green',
    title: `ახალი სპონსორი · ${data?.sponsorTier ?? 'local'}`,
    detail: `${(data?.sponsorWeeklyAmount ?? 0).toLocaleString('ka-GE')} ₾ weekly${calendar ? ` · კვირა ${calendar.weekNo} · დღე ${calendar.dayNo}` : ''}`,
  });
  revalidatePath('/playmanager');
  return {
    success: true,
    message: `სპონსორი განახლდა · ${(data?.sponsorWeeklyAmount ?? 0).toLocaleString('ka-GE')} ₾ weekly`,
  };
}

export async function claimPlayManagerDailyReward(): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (await playManagerActionLimited(user.id, 'finance')) return RATE_LIMITED_RESULT;

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_claim_daily_reward', {
    p_team_id: team.id,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { streak: number; reward: number } | null;

  if (error) {
    if (error.message.includes('already_claimed')) return { success: false, error: 'unavailable' };
    return mapPlayerActionError(error.message);
  }
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: `დღიური ჯილდო · სერია ${data?.streak ?? 1}`,
    detail: `+${(data?.reward ?? 0).toLocaleString('ka-GE')} ₾`,
  });
  revalidatePath('/playmanager');
  return { success: true, message: `+${(data?.reward ?? 0).toLocaleString('ka-GE')} ₾ · სერია ${data?.streak ?? 1}` };
}
