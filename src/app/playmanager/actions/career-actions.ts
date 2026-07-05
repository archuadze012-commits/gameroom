'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  getAuthenticatedTeam,
  logPlayManagerEvent,
  mapPlayerActionError,
  type PlayManagerPlayerActionResult,
} from './action-helpers';

export async function renewPlayManagerCareer(playerId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_career_renew', {
    p_team_id: team.id,
    p_player_id: playerId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { careerEndAge: number; cost: number } | null;

  if (error) {
    if (error.message.includes('not_in_career_window')) return { success: false, error: 'unavailable' };
    return mapPlayerActionError(error.message);
  }
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'finance',
    accent: 'gold',
    title: 'კარიერა გაგრძელდა',
    detail: `კარიერის ბოლო ${data?.careerEndAge ?? ''} წელი · -${(data?.cost ?? 0).toLocaleString('ka-GE')} ₾`,
  });
  revalidatePath(`/playmanager/players/${playerId}`);
  return { success: true, message: `კარიერა გაგრძელდა · -${(data?.cost ?? 0).toLocaleString('ka-GE')} ₾` };
}

export async function releasePlayManagerCareer(playerId: string): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };

  const db = createSupabaseAdminClient();
  const { data: rawData, error } = await db.rpc('pm_career_release', {
    p_team_id: team.id,
    p_player_id: playerId,
  });
  // jsonb return — narrow to the RPC's known result contract.
  const data = rawData as unknown as { comp: number; destination: string } | null;

  if (error) {
    if (error.message.includes('not_in_career_window')) return { success: false, error: 'unavailable' };
    return mapPlayerActionError(error.message);
  }
  await logPlayManagerEvent({
    teamId: team.id,
    category: 'board',
    accent: 'green',
    title: 'მოთამაშეს დაემშვიდობეთ',
    detail: `+${(data?.comp ?? 0).toLocaleString('ka-GE')} ₾ კომპენსაცია`,
  });
  revalidatePath(`/playmanager/players/${playerId}`);
  return { success: true, message: `დამშვიდობება · +${(data?.comp ?? 0).toLocaleString('ka-GE')} ₾` };
}
