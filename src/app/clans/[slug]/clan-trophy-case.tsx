import { Trophy, Swords, Dumbbell, Star } from "lucide-react";

export type ClanTrophyCaseStats = {
  championships: number;
  tournamentsEntered: number;
  scrimsPlayed: number;
  level: number;
};

const TILES = [
  { key: "championships", label: "თასები", icon: Trophy, tone: "text-amber-400", glow: "from-amber-500/25" },
  { key: "tournamentsEntered", label: "ტურნირი", icon: Swords, tone: "text-indigo-300", glow: "from-indigo-500/25" },
  { key: "scrimsPlayed", label: "სკრიმი", icon: Dumbbell, tone: "text-cyan-300", glow: "from-cyan-500/25" },
  { key: "level", label: "დონე", icon: Star, tone: "text-[var(--gr-lime)]", glow: "from-[var(--gr-lime)]/25" },
] as const;

export function ClanTrophyCase({ stats }: { stats: ClanTrophyCaseStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map((t) => {
        const Icon = t.icon;
        const value = stats[t.key];
        return (
          <div key={t.key} className="pubg-loadout-link block" data-variant="strike">
            <div className="pubg-loadout-card relative overflow-hidden p-4">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <div aria-hidden className={`pointer-events-none absolute -top-8 right-0 h-20 w-24 rounded-full bg-gradient-to-b ${t.glow} to-transparent blur-2xl`} />
              <div className="relative z-10 flex items-center gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] ${t.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className={`text-[22px] font-black leading-none tabular-nums ${t.tone}`}>{value.toLocaleString()}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">{t.label}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
