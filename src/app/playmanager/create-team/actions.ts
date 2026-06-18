'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateStarterSquad } from '@/lib/playmanager/players';
import { hasTeam } from '@/lib/playmanager/team';
import { asPlayManagerDb } from '@/lib/playmanager/db';

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

  if (await hasTeam(user.id)) {
    redirect('/playmanager');
  }

  const teamName = (formData.get('team_name') as string | null)?.trim();
  if (!teamName || teamName.length < 3 || teamName.length > 30) {
    return { success: false, error: 'unknown' };
  }

  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { data: existingNames } = await db
    .from<{ normalized_name: string }>('pm_players')
    .select('normalized_name');
  const excludedNames = new Set((existingNames ?? []).map((r) => r.normalized_name));

  // Player names are globally unique, so a fresh squad can collide with names that
  // were taken between our read and the insert. The RPC now fails loudly with
  // `squad_incomplete` instead of silently dropping players — retry with a freshly
  // generated squad a few times so a transient collision self-heals.
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let players;
    try {
      players = await generateStarterSquad(excludedNames);
    } catch {
      // name_pool_exhausted — regenerating won't help; bail out.
      return { success: false, error: 'unknown' };
    }

    const { error } = await db.rpc('pm_create_team', {
      p_user_id: user.id,
      p_team_name: teamName,
      p_players: players,
    });

    if (!error) {
      redirect('/playmanager');
    }

    lastError = error.message;
    if (error.message.includes('pm_teams_name_uniq') || error.message.includes('name_taken')) {
      return { success: false, error: 'name_taken' };
    }
    if (error.message.includes('team_exists')) {
      redirect('/playmanager');
    }
    if (!error.message.includes('squad_incomplete')) {
      return { success: false, error: 'unknown' };
    }
    // squad_incomplete -> loop and regenerate with fresh names.
  }

  console.error('[playmanager] create-team failed after retries', { userId: user.id, lastError });
  return { success: false, error: 'unknown' };
}
