"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PurchaseResult } from "@/types/shop";

export async function purchaseShopItem(itemId: string): Promise<PurchaseResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("purchase_shop_item", { p_item_id: itemId });

  if (error) return { success: false, error: "unknown" };

  const result = data as { success: boolean; error?: string; item_name?: string };
  if (!result.success) {
    const e = result.error;
    if (e === "insufficient_funds" || e === "already_owned" || e === "item_not_found" || e === "not_authenticated") {
      return { success: false, error: e };
    }
    return { success: false, error: "unknown" };
  }

  revalidatePath("/shop");
  return { success: true, item_name: result.item_name ?? "" };
}
