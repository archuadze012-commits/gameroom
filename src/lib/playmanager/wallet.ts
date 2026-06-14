import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { asPlayManagerDb } from './db';

export async function getBalance(teamId: string): Promise<number> {
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { data, error } = await db
    .from<{ balance: number }>('pm_wallets')
    .select('balance')
    .eq('team_id', teamId)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('wallet_not_found');
  return data.balance;
}

export async function creditPm(teamId: string, amount: number, reason: string): Promise<void> {
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { error } = await db.rpc('pm_credit', {
    p_team_id: teamId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

export async function debitPm(teamId: string, amount: number, reason: string): Promise<void> {
  const db = asPlayManagerDb(createSupabaseAdminClient());
  const { error } = await db.rpc('pm_debit', {
    p_team_id: teamId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) {
    if (error.message.includes('insufficient_funds')) throw new Error('insufficient_funds');
    throw new Error(error.message);
  }
}
