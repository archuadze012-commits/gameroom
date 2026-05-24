export type Tier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "crown"
  | "ace"
  | "conqueror";

export type LobbyHudData = {
  gameSlug: string;
  player: {
    displayName: string;
    avatarUrl: string | null;
    level: number;
    levelProgress: number;
    tier: Tier;
    tierSub: "I" | "II" | "III" | "IV" | "V";
    rp: number;
  };
  currencies: {
    pro: number;
    nc: number;
  };
  dailyBonusAvailable: boolean;
  royalePass: {
    season: string;
    rank: number;
    rankProgress: number;
    hasUnclaimedRewards: boolean;
  };
};
