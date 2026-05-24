import type { LobbyHudData, Tier } from "@/types/lobby";

const TIERS: Tier[] = ["bronze", "silver", "gold", "platinum", "diamond", "crown", "ace", "conqueror"];
const TIER_SUBS: LobbyHudData["player"]["tierSub"][] = ["V", "IV", "III", "II", "I"];

function hashUsername(username: string) {
  let hash = 2166136261;
  for (let index = 0; index < username.length; index += 1) {
    hash ^= username.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRange(seed: number, min: number, max: number, salt: number) {
  const next = Math.imul(seed ^ salt, 1103515245) + 12345;
  const value = (next >>> 0) / 0xffffffff;
  return Math.floor(min + value * (max - min + 1));
}

export function getMockHud(username: string): LobbyHudData {
  const seed = hashUsername(username || "player");
  const level = seededRange(seed, 12, 96, 7);
  const rank = seededRange(seed, 18, 84, 19);

  /*
   * TODO: Replace this deterministic mock with a server snapshot once the lobby
   * HUD table exists.
   *
   * const { data } = await supabase
   *   .from("lobby_hud")
   *   .select("player,currencies,royale_pass")
   *   .eq("username", username)
   *   .maybeSingle();
   */
  return {
    player: {
      displayName: username,
      avatarUrl: null,
      level,
      levelProgress: seededRange(seed, 18, 94, 11) / 100,
      tier: TIERS[seededRange(seed, 0, TIERS.length - 1, 23)] ?? "gold",
      tierSub: TIER_SUBS[seededRange(seed, 0, TIER_SUBS.length - 1, 29)] ?? "III",
      rp: seededRange(seed, 1600, 6800, 31),
    },
    currencies: {
      silver: seededRange(seed, 400, 98000, 37),
      bp: seededRange(seed, 1200, 640000, 41),
      uc: seededRange(seed, 60, 12800, 43),
    },
    royalePass: {
      season: "M22",
      rank,
      rankProgress: seededRange(seed, 8, 98, 47) / 100,
      hasUnclaimedRewards: seededRange(seed, 0, 1, 53) === 1,
    },
  };
}
