"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EquipResult =
  | { success: true; category: string }
  | { success: false; error: string };

export async function equipItem(itemId: string): Promise<EquipResult> {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("equip_item_as", {
    p_user_id: user.id,
    p_item_id: itemId,
  });

  if (error) return { success: false, error: "unknown" };

  const result = data as { success: boolean; error?: string; category?: string };
  if (!result.success) return { success: false, error: result.error ?? "unknown" };

  revalidatePath("/shop");
  return { success: true, category: result.category ?? "" };
}

export async function unequipCategory(category: string): Promise<EquipResult> {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("unequip_category_as", {
    p_user_id: user.id,
    p_category: category,
  });

  if (error) return { success: false, error: "unknown" };

  const result = data as { success: boolean; error?: string };
  if (!result.success) return { success: false, error: result.error ?? "unknown" };

  revalidatePath("/shop");
  return { success: true, category };
}
