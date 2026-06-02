import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ShopItem } from "@/types/shop";
import { getEquippedItemIds } from "@/lib/shop/equip-queries";

const GAME_CATEGORIES = ["combo", "character", "vehicle", "lobby_effect", "badge", "name_card"];

async function fetchOwned(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("user_purchases").select("item_id").eq("user_id", userId);
  return new Set((data ?? []).map((p) => p.item_id));
}

function toShopItems(items: Record<string, unknown>[], ownedIds: Set<string>, equippedIds: Set<string>): ShopItem[] {
  return items.map((item) => ({
    ...item,
    metadata: ((item.metadata as Record<string, unknown>) ?? {}) as Record<string, unknown>,
    owned: ownedIds.has(item.id as string),
    equipped: equippedIds.has(item.id as string),
  })) as ShopItem[];
}

export async function getGameShopItems(userId: string | null, gameSlug: string): Promise<ShopItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data: items } = await supabase
    .from("shop_items")
    .select("id, name, description, category, image_url, cost_currency, cost_amount, tier, metadata, game_slug")
    .eq("is_active", true)
    .or(`game_slug.eq.${gameSlug},and(game_slug.is.null,category.in.(${GAME_CATEGORIES.join(",")}))`)
    .order("sort_order");

  if (!items?.length) return [];
  const [ownedIds, equippedIds] = userId
    ? await Promise.all([fetchOwned(userId), getEquippedItemIds(userId)])
    : [new Set<string>(), new Set<string>()];
  return toShopItems(items, ownedIds, equippedIds);
}

export async function getGlobalShopItems(userId: string | null): Promise<ShopItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data: items } = await supabase
    .from("shop_items")
    .select("id, name, description, category, image_url, cost_currency, cost_amount, tier, metadata, game_slug")
    .eq("is_active", true)
    .is("game_slug", null)
    .not("category", "in", `(${GAME_CATEGORIES.join(",")})`)
    .order("sort_order");

  if (!items?.length) return [];
  const [ownedIds, equippedIds] = userId
    ? await Promise.all([fetchOwned(userId), getEquippedItemIds(userId)])
    : [new Set<string>(), new Set<string>()];
  return toShopItems(items, ownedIds, equippedIds);
}
