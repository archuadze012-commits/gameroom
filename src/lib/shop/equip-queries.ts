import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type EquippedItem = {
  category: string;
  item_id: string;
  metadata: Record<string, unknown>;
};

export async function getEquippedItems(userId: string): Promise<EquippedItem[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("user_equipped")
    .select("category, item_id, shop_items(metadata)")
    .eq("user_id", userId);

  if (!data?.length) return [];

  return data.map((row) => ({
    category: row.category,
    item_id: row.item_id,
    metadata: ((row.shop_items as unknown as { metadata: Record<string, unknown> })?.metadata ?? {}) as Record<string, unknown>,
  }));
}

export async function getEquippedItemIds(userId: string): Promise<Set<string>> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("user_equipped")
    .select("item_id")
    .eq("user_id", userId);

  return new Set((data ?? []).map((r) => r.item_id));
}
