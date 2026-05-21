export type BadgeDef = {
  code: string;
  name: string;
  description: string;
  emoji: string;
};

export const BADGES: BadgeDef[] = [
  { code: "first_post",    name: "პირველი ნაბიჯი",    description: "შენი პირველი პოსტი",         emoji: "✍️" },
  { code: "ten_posts",     name: "მწერალი",            description: "10 პოსტი",                    emoji: "📝" },
  { code: "hundred_likes", name: "პოპულარული",         description: "შენი პოსტებზე 100 ლაიქი",    emoji: "❤️" },
  { code: "ten_followers", name: "მცირე ჯგუფი",        description: "10 გამომწერი",                emoji: "👥" },
  { code: "hundred_followers", name: "ფავორიტი",      description: "100 გამომწერი",               emoji: "⭐" },
  { code: "streak_7",      name: "კვირის თამაშოსანი",  description: "7 დღე ზედიზედ",              emoji: "🔥" },
  { code: "streak_30",     name: "მთვარის გმირი",      description: "30 დღე ზედიზედ",             emoji: "🌟" },
  { code: "verified",      name: "ვერიფიცირებული",     description: "ცისფერი badge-ის მფლობელი", emoji: "✅" },
  { code: "level_10",      name: "Level 10",           description: "მიაღწიე Level 10-ს",         emoji: "🎯" },
  { code: "level_25",      name: "Level 25",           description: "მიაღწიე Level 25-ს",         emoji: "💎" },
];

export function badgeByCode(code: string): BadgeDef | undefined {
  return BADGES.find((b) => b.code === code);
}

// Level formula: matches the SQL function in award_xp
export function xpToLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}

export function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 100;
}

export function levelProgress(xp: number): { level: number; nextLevelXp: number; currentLevelXp: number; pct: number } {
  const level = xpToLevel(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const pct = Math.min(100, Math.max(0, ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100));
  return { level, nextLevelXp, currentLevelXp, pct };
}
