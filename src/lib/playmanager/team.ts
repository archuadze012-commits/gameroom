import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { PmTeam } from './types';

export async function hasTeam(userId: string): Promise<boolean> {
  const db = createSupabaseAdminClient();
  const { count } = await db
    .from('pm_teams')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

// pm_wallets rides along as an embedded relation — getTeam runs on every
// /playmanager* request, so one round trip instead of two matters.
type WalletEmbed = { balance: number } | { balance: number }[] | null;

function walletBalance(wallet: WalletEmbed): number {
  if (Array.isArray(wallet)) return wallet[0]?.balance ?? 0;
  return wallet?.balance ?? 0;
}

export async function getTeam(
  userId: string,
): Promise<(PmTeam & { balance: number }) | null> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('pm_teams')
    .select('*, pm_wallets(balance)')
    .eq('user_id', userId)
    .single();
  if (!data) return null;
  const { pm_wallets: wallet, ...team } = data as PmTeam & { pm_wallets: WalletEmbed };
  return { ...team, balance: walletBalance(wallet) };
}

export async function getDevelopmentFallbackTeam(): Promise<(PmTeam & { balance: number }) | null> {
  // Defense-in-depth: this returns the oldest team with NO auth, purely a local
  // dev convenience. Callers already gate it behind a login redirect in prod,
  // but hard-fail here too so a future caller can never leak the first team.
  if (process.env.NODE_ENV === 'production') return null;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('pm_teams')
    .select('*, pm_wallets(balance)')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (!data) return null;
  const { pm_wallets: wallet, ...team } = data as PmTeam & { pm_wallets: WalletEmbed };
  return { ...team, balance: walletBalance(wallet) };
}
