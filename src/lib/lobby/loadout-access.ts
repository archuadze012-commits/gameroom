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

  console.log("[getOwnedLoadoutIds]", {
    userId,
    gameSlug,
    error,
    rowCount: data?.length,
    firstRow: data?.[0],
  });

  const owned: OwnedLoadoutIds = {
    comboIds: new Set<string>(),
    characterIds: new Set<string>(),
    weaponIds: new Set<string>(),
    vehicleIds: new Set<string>(),
    effectIds: new Set<string>(),
    nameCardIds: new Set<string>(),
  };

  for (const row of (data ?? []) as PurchasedShopItemRow[]) {
    const item = row.shop_items;
    if (!item) continue;

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
