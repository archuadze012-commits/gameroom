import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { asPlayManagerDb } from './db';
import type { PmTeam } from './types';

export async function hasTeam(userId: string): Promise<boolean> {
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { count } = await db
    .from<{ id: string }>('pm_teams')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

export async function getTeam(
  userId: string,
): Promise<(PmTeam & { balance: number }) | null> {
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { data: team } = await db
    .from<PmTeam>('pm_teams')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (!team) return null;
  const { data: wallet } = await db
    .from<{ balance: number }>('pm_wallets')
    .select('balance')
    .eq('team_id', team.id)
    .single();
  return { ...team, balance: wallet?.balance ?? 0 };
}

export async function getDevelopmentFallbackTeam(): Promise<(PmTeam & { balance: number }) | null> {
  // Defense-in-depth: this returns the oldest team with NO auth, purely a local
  // dev convenience. Callers already gate it behind a login redirect in prod,
  // but hard-fail here too so a future caller can never leak the first team.
  if (process.env.NODE_ENV === 'production') return null;
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { data: team } = await db
    .from<PmTeam>('pm_teams')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (!team) return null;
  const { data: wallet } = await db
    .from<{ balance: number }>('pm_wallets')
    .select('balance')
    .eq('team_id', team.id)
    .single();
  return { ...team, balance: wallet?.balance ?? 0 };
}
