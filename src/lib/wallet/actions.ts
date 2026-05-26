"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClaimResult =
  | { success: true; amount: number }
  | { success: false; error: "already_claimed" | "not_authenticated" | "unknown" };

export async function claimDailyBonus(): Promise<ClaimResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("claim_daily_bonus");

  if (error) return { success: false, error: "unknown" };

  const result = data as { success: boolean; error?: string; amount?: number };
  if (!result.success) {
    const err = result.error;
    if (err === "already_claimed" || err === "not_authenticated") {
      return { success: false, error: err };
    }
    return { success: false, error: "unknown" };
  }

  return { success: true, amount: result.amount ?? 10 };
}

export type GrantResult =
  | { success: true; amount: number; currency: string }
  | { success: false; error: "unauthorized" | "invalid_amount" | "unknown" };

export async function adminGrantCurrency(
  targetUserId: string,
  currency: "nc" | "pro",
  amount: number,
  note: string,
  targetUsername: string,
): Promise<GrantResult> {
  if (amount <= 0 || !Number.isInteger(amount)) {
    return { success: false, error: "invalid_amount" };
  }

  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { success: false, error: "unauthorized" };

  const { data: profile } = await auth
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") return { success: false, error: "unauthorized" };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("admin_grant_currency_as", {
    p_admin_id: user.id,
    p_user_id: targetUserId,
    p_currency: currency,
    p_amount: amount,
    p_note: note || null,
  });

  if (error) return { success: false, error: "unknown" };

  const result = data as { success: boolean; error?: string; amount?: number; currency?: string };
  if (!result.success) {
    if (result.error === "unauthorized") return { success: false, error: "unauthorized" };
    return { success: false, error: "unknown" };
  }

  revalidatePath(`/profile/${targetUsername}`);
  return { success: true, amount: amount, currency };
}
