import type { LobbyHudData, Tier } from "@/types/lobby";
import { levelProgress, xpToLevel } from "@/lib/badges";

type WalletSnapshot = {
  pro_balance: number;
  nc_balance: number;
};

type LobbyHudSnapshotInput = {
  gameSlug: string;
  displayName: string;
  avatarUrl: string | null;
  level?: number | null;
  xp?: number | null;
  wallet?: WalletSnapshot | null;
  dailyBonusAvailable?: boolean;
};

const TIER_LADDER: Array<{ minLevel: number; tier: Tier; tierSub: LobbyHudData["player"]["tierSub"] }> = [
  { minLevel: 60, tier: "conqueror", tierSub: "I" },
  { minLevel: 50, tier: "ace", tierSub: "II" },
  { minLevel: 42, tier: "crown", tierSub: "III" },
  { minLevel: 34, tier: "diamond", tierSub: "IV" },
  { minLevel: 26, tier: "platinum", tierSub: "I" },
  { minLevel: 18, tier: "gold", tierSub: "II" },
  { minLevel: 10, tier: "silver", tierSub: "III" },
  { minLevel: 1, tier: "bronze", tierSub: "V" },
];

function resolveTier(level: number) {
  return TIER_LADDER.find((entry) => level >= entry.minLevel) ?? TIER_LADDER[TIER_LADDER.length - 1];
}

export function buildLobbyHudData({
  gameSlug,
  displayName,
  avatarUrl,
  level,
  xp,
  wallet = null,
  dailyBonusAvailable = false,
}: LobbyHudSnapshotInput): LobbyHudData {
  const resolvedXp = Math.max(0, xp ?? 0);
  const progress = levelProgress(resolvedXp);
  const resolvedLevel = Math.max(1, level ?? progress.level ?? xpToLevel(resolvedXp));
  const tier = resolveTier(resolvedLevel);

  return {
    gameSlug,
    player: {
      displayName,
      avatarUrl,
      level: resolvedLevel,
      levelProgress: progress.pct / 100,
      tier: tier.tier,
      tierSub: tier.tierSub,
      rp: 0,
    },
    currencies: wallet
      ? {
          pro: wallet.pro_balance,
          nc: wallet.nc_balance,
        }
      : null,
    dailyBonusAvailable,
    royalePass: {
      season: "M22",
      rank: 1,
      rankProgress: 0,
      hasUnclaimedRewards: false,
    },
  };
}
