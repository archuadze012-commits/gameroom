import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type WalletData = {
  nc_balance: number;
  pro_balance: number;
};

export async function getWallet(userId: string): Promise<WalletData> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("wallets")
    .select("nc_balance, pro_balance")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    nc_balance: data?.nc_balance ?? 0,
    pro_balance: data?.pro_balance ?? 0,
  };
}

export async function getDailyBonusAvailable(userId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("last_login_award_at")
    .eq("id", userId)
    .maybeSingle();

  const last = data?.last_login_award_at;
  if (!last) return true;
  const today = new Date().toISOString().slice(0, 10);
  return last < today;
}
