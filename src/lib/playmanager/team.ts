import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { PmTeam } from './types.js';

export async function hasTeam(userId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { count } = await supabase
    .from('pm_teams')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

export async function getTeam(
  userId: string,
): Promise<(PmTeam & { balance: number }) | null> {
  const supabase = createSupabaseAdminClient();
  const { data: team } = await supabase
    .from('pm_teams')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (!team) return null;
  const { data: wallet } = await supabase
    .from('pm_wallets')
    .select('balance')
    .eq('team_id', team.id)
    .single();
  return { ...team, balance: wallet?.balance ?? 0 };
}

export async function getSquadCount(teamId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { count } = await supabase
    .from('pm_squads')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId);
  return count ?? 0;
}
