export type ShopCategory =
  | "character"
  | "profile_frame"
  | "name_frame"
  | "name_card"
  | "profile_theme"
  | "lobby_effect"
  | "badge"
  | "chat_flair"
  | "cover";

export type ShopTier = "common" | "rare" | "epic" | "legendary";

export type ShopItem = {
  id: string;
  name: string;
  description: string | null;
  category: ShopCategory;
  image_url: string | null;
  cost_currency: "nc" | "pro";
  cost_amount: number;
  tier: ShopTier;
  metadata: Record<string, unknown>;
  owned: boolean;
  equipped: boolean;
};

export type PurchaseResult =
  | { success: true; item_name: string }
  | { success: false; error: "insufficient_funds" | "already_owned" | "item_not_found" | "not_authenticated" | "unknown" };

type CategoryMeta = { key: ShopCategory; label: string; emoji: string };

export const GLOBAL_SHOP_CATEGORIES: CategoryMeta[] = [
  { key: "cover",          label: "ქავერი",            emoji: "🏞️" },
  { key: "profile_frame",  label: "პროფილის ჩარჩო",   emoji: "🖼️" },
  { key: "name_frame",     label: "სახელის ჩარჩო",    emoji: "✨" },
  { key: "profile_theme",  label: "პროფილის თემა",     emoji: "🎨" },
  { key: "chat_flair",     label: "ჩატის ფლეარი",     emoji: "💬" },
];

export const GAME_SHOP_CATEGORIES: CategoryMeta[] = [
  { key: "character",      label: "გმირები",           emoji: "🎭" },
  { key: "lobby_effect",   label: "ლობის ეფექტი",     emoji: "⚡" },
  { key: "badge",          label: "ბეჯები",            emoji: "🏅" },
  { key: "name_card",      label: "Name Card",         emoji: "🪪" },
];

export const SHOP_CATEGORIES: CategoryMeta[] = [
  ...GAME_SHOP_CATEGORIES,
  ...GLOBAL_SHOP_CATEGORIES.filter((c) => !GAME_SHOP_CATEGORIES.some((g) => g.key === c.key)),
];
