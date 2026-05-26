import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function awardXp(userId: string, amount: number) {
  if (!userId || !Number.isInteger(amount) || amount <= 0) return;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("award_xp", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    console.error("[awardXp] failed:", error);
  }
}
