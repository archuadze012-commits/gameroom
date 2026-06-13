import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function getBalance(teamId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('pm_wallets')
    .select('balance')
    .eq('team_id', teamId)
    .single();
  if (error) throw new Error(error.message);
  return data.balance;
}

export async function creditPm(teamId: string, amount: number, reason: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc('pm_credit', {
    p_team_id: teamId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

export async function debitPm(teamId: string, amount: number, reason: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc('pm_debit', {
    p_team_id: teamId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) {
    if (error.message.includes('insufficient_funds')) throw new Error('insufficient_funds');
    throw new Error(error.message);
  }
}
