import { Sparkles, Flame } from "lucide-react";
import { BADGES, badgeByCode, levelProgress } from "@/lib/badges";

type Props = {
  xp: number;
  streak: number;
  unlockedBadgeCodes: string[];
};

export function ProfileXp({ xp, streak, unlockedBadgeCodes }: Props) {
  const { level, currentLevelXp, nextLevelXp, pct } = levelProgress(xp);
  const unlocked = unlockedBadgeCodes.map((c) => badgeByCode(c)).filter(Boolean);
  const locked = BADGES.filter((b) => !unlockedBadgeCodes.includes(b.code));

  return (
    <div className="space-y-4 rounded-md border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Level {level}</span>
          <span className="text-xs text-muted-foreground">({xp} XP)</span>
        </div>
        {streak > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <Flame className="h-3.5 w-3.5" /> {streak} დღე ზედიზედ
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-secondary/60">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          {xp - currentLevelXp} / {nextLevelXp - currentLevelXp} XP next level
        </p>
      </div>

      {unlocked.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Badges ({unlocked.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unlocked.map((b) => (
              <div
                key={b!.code}
                title={`${b!.name} — ${b!.description}`}
                className="flex h-10 w-10 cursor-help items-center justify-center rounded-lg border border-border/60 bg-secondary/30 text-lg"
              >
                {b!.emoji}
              </div>
            ))}
            {locked.slice(0, 6).map((b) => (
              <div
                key={b.code}
                title={`🔒 ${b.name} — ${b.description}`}
                className="flex h-10 w-10 cursor-help items-center justify-center rounded-lg border border-dashed border-border/30 text-lg opacity-30"
              >
                {b.emoji}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
