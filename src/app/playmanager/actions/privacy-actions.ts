'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  getAuthenticatedTeam,
  mapPlayerActionError,
  playManagerActionLimited,
  RATE_LIMITED_RESULT,
  type PlayManagerPlayerActionResult,
} from './action-helpers';

// Save the current manager's team-privacy toggles (hide squad / wallet /
// transfers from other managers). Writes through the SECURITY DEFINER
// pm_set_team_privacy RPC — direct pm_teams-side writes are revoked.
export async function savePlayManagerPrivacy(input: {
  hideSquad: boolean;
  hideWallet: boolean;
  hideTransfers: boolean;
}): Promise<PlayManagerPlayerActionResult> {
  const { user, team } = await getAuthenticatedTeam();
  if (!user) return { success: false, error: 'unauthenticated' };
  if (!team) return { success: false, error: 'team_missing' };
  if (await playManagerActionLimited(user.id, 'privacy')) return RATE_LIMITED_RESULT;

  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_set_team_privacy', {
    p_team_id: team.id,
    p_hide_squad: input.hideSquad,
    p_hide_wallet: input.hideWallet,
    p_hide_transfers: input.hideTransfers,
    p_user_id: user.id,
  });

  if (error) return mapPlayerActionError(error.message);

  revalidatePath('/playmanager');
  revalidatePath(`/playmanager/managers/${user.id}`);
  revalidatePath(`/playmanager/teams/${team.id}`);
  return { success: true, message: 'პრივატულობის პარამეტრები შენახულია' };
}
