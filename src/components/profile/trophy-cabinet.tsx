import { BADGES, levelProgress } from "@/lib/badges";

// Trophy Cabinet — surfaces the existing gamification layer (level ring + XP bar
// + streak flame + earned/locked badges) on the profile. Pure server component:
// all animation is CSS-only, so it needs no 'use client' and streams with the page.

type TrophyCabinetProps = {
  xp: number;
  streak: number;
  isVerified: boolean;
  unlockedCodes: string[];
};

const RING_SIZE = 116;
const RING_STROKE = 9;

export function TrophyCabinet({ xp, streak, isVerified, unlockedCodes }: TrophyCabinetProps) {
  const { level, currentLevelXp, nextLevelXp, pct } = levelProgress(xp);
  const owned = new Set(unlockedCodes);

  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  const xpIntoLevel = Math.max(0, xp - currentLevelXp);
  const xpSpan = Math.max(1, nextLevelXp - currentLevelXp);
  const earnedCount = BADGES.filter((b) => owned.has(b.code)).length;
  const flameActive = streak > 0;

  return (
    <div className="pubg-loadout-link group relative block" data-variant="royale">
      <div className="pubg-loadout-card relative overflow-hidden p-6 sm:p-7">
        <span aria-hidden className="pubg-loadout-field absolute inset-0" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-28 w-28 opacity-25" />
        <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3" />

        <div className="relative z-[1] flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
            <div>
              <p className="font-display text-[11px] font-black uppercase leading-none tracking-[0.28em] text-[var(--gr-lime,#a3e635)]">
                Trophy Cabinet
              </p>
              <span aria-hidden className="pubg-loadout-marker mt-2 block h-px w-14" />
            </div>
            <span className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
              {earnedCount}/{BADGES.length}
            </span>
          </div>

          {/* Level ring + XP bar + streak */}
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-7">
            {/* Level ring */}
            <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
              <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
                <defs>
                  <linearGradient id="tc-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--gr-violet-hi,#a78bfa)" />
                    <stop offset="55%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="var(--gr-lime,#a3e635)" />
                  </linearGradient>
                </defs>
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={RING_STROKE}
                />
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={radius}
                  fill="none"
                  stroke="url(#tc-ring)"
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ filter: "drop-shadow(0 0 6px rgba(167,139,250,0.55))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[9px] font-black uppercase tracking-[0.24em] text-white/45">
                  Level
                </span>
                <span className="font-display text-[34px] font-black leading-none text-white drop-shadow-[0_0_12px_rgba(167,139,250,0.5)]">
                  {level}
                </span>
              </div>
            </div>

            {/* XP bar + streak stack */}
            <div className="flex w-full flex-col gap-4">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-white/55">
                    XP
                  </span>
                  <span className="font-display text-[11px] font-black tracking-wide text-white/80">
                    {xpIntoLevel.toLocaleString()}
                    <span className="text-white/35"> / {xpSpan.toLocaleString()}</span>
                  </span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-inset ring-white/10">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      background:
                        "linear-gradient(90deg, var(--gr-violet-hi,#a78bfa), #ec4899 55%, var(--gr-lime,#a3e635))",
                      boxShadow: "0 0 10px rgba(163,230,53,0.4)",
                    }}
                  />
                </div>
                <p className="mt-1 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                  {Math.round(pct)}% → Level {level + 1}
                </p>
              </div>

              {/* Streak flame */}
              <div
                className="flex items-center gap-2.5 rounded-2xl border px-3 py-2"
                style={{
                  borderColor: flameActive ? "rgba(251,146,60,0.35)" : "rgba(255,255,255,0.08)",
                  background: flameActive
                    ? "linear-gradient(90deg, rgba(251,146,60,0.14), rgba(236,72,153,0.06))"
                    : "rgba(255,255,255,0.03)",
                }}
              >
                <span
                  className={flameActive ? "animate-pulse text-[22px] leading-none" : "text-[22px] leading-none grayscale opacity-40"}
                  style={flameActive ? { filter: "drop-shadow(0 0 8px rgba(251,146,60,0.7))" } : undefined}
                  aria-hidden
                >
                  🔥
                </span>
                <div className="leading-tight">
                  <p className="font-display text-[15px] font-black text-white">
                    {streak}{" "}
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
                      დღე ზედიზედ
                    </span>
                  </p>
                  <p className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                    {flameActive ? "სერია აქტიურია" : "სერია გამქრალია"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Badges grid */}
          <div>
            <p className="mb-3 font-display text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
              Badges
            </p>
            <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-10">
              {BADGES.map((badge) => {
                const isOwned = badge.code === "verified" ? isVerified : owned.has(badge.code);
                return (
                  <div
                    key={badge.code}
                    title={`${badge.name} — ${badge.description}${isOwned ? "" : " (ჩაკეტილი)"}`}
                    className="group/badge relative flex aspect-square items-center justify-center rounded-2xl border transition-transform duration-300 hover:scale-[1.08]"
                    style={{
                      borderColor: isOwned ? "rgba(163,230,53,0.35)" : "rgba(255,255,255,0.06)",
                      background: isOwned
                        ? "linear-gradient(135deg, rgba(167,139,250,0.18), rgba(236,72,153,0.1))"
                        : "rgba(255,255,255,0.02)",
                      boxShadow: isOwned ? "0 0 14px rgba(167,139,250,0.25)" : "none",
                    }}
                  >
                    <span
                      className={isOwned ? "text-[22px] leading-none" : "text-[22px] leading-none grayscale opacity-25"}
                      aria-hidden
                    >
                      {badge.emoji}
                    </span>
                    {!isOwned && (
                      <span
                        aria-hidden
                        className="absolute bottom-1 right-1 text-[9px] leading-none opacity-50"
                      >
                        🔒
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
