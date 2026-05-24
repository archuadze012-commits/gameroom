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
    silver: number;
    bp: number;
    uc: number;
  };
  royalePass: {
    season: string;
    rank: number;
    rankProgress: number;
    hasUnclaimedRewards: boolean;
  };
};
