import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeLobbyLoadout, type LoadoutData } from "./loadout";

type OwnedLoadoutIds = {
  comboIds: Set<string>;
  characterIds: Set<string>;
  weaponIds: Set<string>;
  vehicleIds: Set<string>;
  effectIds: Set<string>;
  nameCardIds: Set<string>;
};

type PurchasedShopItemRow = {
  shop_items: {
    id: string;
    category: string;
    game_slug: string | null;
    metadata: Record<string, unknown> | null;
  };
};

function readStringMetadata(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
  fallback: string,
) {
  const candidate = metadata?.[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : fallback;
}

function toLoadoutEffectId(metadata: Record<string, unknown> | null | undefined) {
  const explicitId = metadata?.loadout_effect_id;
  if (typeof explicitId === "string" && explicitId.trim()) return explicitId.trim();

  if (metadata?.effect === "fire_lobby") return "fx_fire";
  return null;
}

async function getOwnedLoadoutIds(
  userId: string,
  gameSlug: string,
): Promise<OwnedLoadoutIds> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_purchases")
    .select("shop_items!inner(id, category, game_slug, metadata)")
    .eq("user_id", userId);

  console.log("[getOwnedLoadoutIds] rawShape", {
    userId,
    error,
    rowCount: data?.length,
    sample: JSON.stringify(data?.slice(0, 3)),
  });

  const owned: OwnedLoadoutIds = {
    comboIds: new Set<string>(),
    characterIds: new Set<string>(),
    weaponIds: new Set<string>(),
    vehicleIds: new Set<string>(),
    effectIds: new Set<string>(),
    nameCardIds: new Set<string>(),
  };

  let processed = 0, skipped = 0, weaponCount = 0, comboCount = 0;
  for (const row of (data ?? []) as Array<{ shop_items: PurchasedShopItemRow["shop_items"] | PurchasedShopItemRow["shop_items"][] | null }>) {
    // Supabase may return the joined relation as a single object OR an array,
    // depending on type inference quirks across versions. Handle both.
    const rawItem = row.shop_items;
    const items = Array.isArray(rawItem) ? rawItem : rawItem ? [rawItem] : [];
    for (const item of items) {
      if (!item) { skipped++; continue; }
      if (item.category === "weapon") weaponCount++;
      if (item.category === "combo") comboCount++;
      processed++;

    const isSameGame = item.game_slug === null || item.game_slug === gameSlug;
    if (!isSameGame) continue;

    if (item.category === "combo") {
      owned.comboIds.add(readStringMetadata(item.metadata, "combo_id", item.id));
      continue;
    }

    if (item.category === "character") {
      owned.characterIds.add(readStringMetadata(item.metadata, "character_id", item.id));
      continue;
    }

    if (item.category === "weapon") {
      owned.weaponIds.add(readStringMetadata(item.metadata, "weapon_id", item.id));
      continue;
    }

    if (item.category === "vehicle") {
      owned.vehicleIds.add(readStringMetadata(item.metadata, "vehicle_id", item.id));
      continue;
    }

    if (item.category === "lobby_effect") {
      const effectId = toLoadoutEffectId(item.metadata);
      if (effectId) owned.effectIds.add(effectId);
      continue;
    }

    if (item.category === "name_card") {
      owned.nameCardIds.add(readStringMetadata(item.metadata, "name_card_id", item.id));
    }
    }
  }

  console.log("[getOwnedLoadoutIds] result", {
    userId,
    processed,
    skipped,
    weaponRowCount: weaponCount,
    comboRowCount: comboCount,
    weaponIds: [...owned.weaponIds],
    comboIds: [...owned.comboIds],
    characterIds: [...owned.characterIds],
    vehicleIds: [...owned.vehicleIds],
    effectIds: [...owned.effectIds],
  });

  return owned;
}

export async function normalizeUserLobbyLoadout(
  userId: string,
  gameSlug: string,
  input: unknown,
): Promise<Required<LoadoutData>> {
  const ownedIds = await getOwnedLoadoutIds(userId, gameSlug);

  return normalizeLobbyLoadout(input, {
    comboIds: ownedIds.comboIds,
    characterIds: ownedIds.characterIds,
    weaponIds: ownedIds.weaponIds,
    vehicleIds: ownedIds.vehicleIds,
    effectIds: ownedIds.effectIds,
    nameCardIds: ownedIds.nameCardIds,
  });
}
