'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { hasTeam } from '@/lib/playmanager/team';
import { playManagerActionLimited } from '../actions/action-helpers';

export type CreateTeamResult =
  | { success: true }
  | { success: false; error: 'unauthenticated' | 'team_exists' | 'name_taken' | 'unknown' };

export async function createTeamAction(
  _prev: CreateTeamResult | null,
  formData: FormData,
): Promise<CreateTeamResult> {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { success: false, error: 'unauthenticated' };
  // Team creation drafts a full squad inside the RPC — the heaviest single
  // mutation in PlayManager — so it gets a tighter bucket than regular actions.
  if (playManagerActionLimited(user.id, 'create_team', 3, 30_000)) {
    return { success: false, error: 'unknown' };
  }

  if (await hasTeam(user.id)) {
    redirect('/playmanager');
  }

  const teamName = (formData.get('team_name') as string | null)?.trim();
  if (!teamName || teamName.length < 3 || teamName.length > 30) {
    return { success: false, error: 'unknown' };
  }

  // Real-players-only: the team is drafted from the existing pool of unowned real
  // (EAFC) players inside the RPC — no virtual generation here anymore.
  const db = createSupabaseAdminClient();
  const { error } = await db.rpc('pm_create_team_v2', {
    p_user_id: user.id,
    p_team_name: teamName,
  });

  if (!error) {
    redirect('/playmanager');
  }

  if (error.message.includes('pm_teams_name_uniq') || error.message.includes('name_taken')) {
    return { success: false, error: 'name_taken' };
  }
  if (error.message.includes('team_exists')) {
    redirect('/playmanager');
  }

  console.error('[playmanager] create-team failed', { userId: user.id, error: error.message });
  return { success: false, error: 'unknown' };
}
