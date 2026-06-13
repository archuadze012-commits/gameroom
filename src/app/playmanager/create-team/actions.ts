'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateStarterSquad } from '@/lib/playmanager/players';
import { hasTeam } from '@/lib/playmanager/team';

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

  if (await hasTeam(user.id)) return { success: false, error: 'team_exists' };

  const teamName = (formData.get('team_name') as string | null)?.trim();
  if (!teamName || teamName.length < 3 || teamName.length > 30) {
    return { success: false, error: 'unknown' };
  }

  const admin = createSupabaseAdminClient();
  const { data: existingNames } = await admin
    .from('pm_players')
    .select('normalized_name');
  const excludedNames = new Set((existingNames ?? []).map((r: { normalized_name: string }) => r.normalized_name));

  const players = await generateStarterSquad(excludedNames);

  const { error } = await admin.rpc('pm_create_team', {
    p_user_id: user.id,
    p_team_name: teamName,
    p_players: players,
  });

  if (error) {
    if (error.message.includes('pm_teams_name_uniq') || error.message.includes('name_taken')) {
      return { success: false, error: 'name_taken' };
    }
    if (error.message.includes('team_exists')) {
      return { success: false, error: 'team_exists' };
    }
    return { success: false, error: 'unknown' };
  }

  redirect('/playmanager');
}
