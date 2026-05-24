export type ItemTier = "common" | "rare" | "epic" | "legendary";
export type ItemType = "cosmetic" | "badge" | "character_skin" | "weapon_skin";

export type BoxItem = {
  id: string;
  item_name: string;
  item_type: ItemType;
  tier: ItemTier;
  image_url: string | null;
  weight: number;
};

export type EventBox = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost_currency: "nc" | "pro";
  cost_amount: number;
  items: BoxItem[];
};

export type OpenBoxResult =
  | { success: true; item: { id: string; name: string; tier: ItemTier; item_type: ItemType; image_url: string | null } }
  | { success: false; error: "insufficient_funds" | "box_not_found" | "not_authenticated" | "unknown" };
