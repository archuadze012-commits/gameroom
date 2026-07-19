import { Gauge, Trophy, Swords, Percent, Award } from "lucide-react";
import type { PlayerStats } from "@/lib/player/stats";

const FORM_DOT: Record<string, string> = {
  win: "bg-[var(--gr-lime)]",
  loss: "bg-red-500",
  draw: "bg-white/40",
};

// A player's competitive record, 100% derived from the tournament engine
// (per-player ELO + tournaments + championships). Renders an empty state until
// they've played real matches, so it's honest during beta.
export function PlayerStatsCard({ stats }: { stats: PlayerStats }) {
  const empty = stats.games === 0 && stats.tournaments === 0 && stats.championships === 0;

  return (
    <div className="pubg-loadout-link block" data-variant="strike">
      <div className="pubg-loadout-card relative overflow-hidden p-5">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[var(--gr-violet-hi)]/70" />
        <div className="relative z-10">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
              <Gauge className="h-4 w-4 text-[var(--gr-violet-hi)]" /> სტატისტიკა
            </div>
            {stats.form.length > 0 && (
              <div className="flex flex-row-reverse gap-1">
                {stats.form.map((r, i) => (
                  <span key={i} title={r} className={`h-3 w-3 rounded-sm ${FORM_DOT[r]}`} />
                ))}
              </div>
            )}
          </div>

          {empty ? (
            <p className="py-4 text-center text-[12.5px] text-white/40">ჯერ არ არის — ითამაშე ტურნირი და გამოჩნდება.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Tile
                icon={Gauge}
                tone="text-[var(--gr-violet-hi)]"
                value={stats.rating ?? "—"}
                label={stats.rank ? `Rating · #${stats.rank}` : "Rating"}
              />
              <Tile icon={Swords} tone="text-white" value={`${stats.w}-${stats.l}-${stats.d}`} label="W · L · D" />
              <Tile icon={Percent} tone="text-[var(--gr-lime)]" value={`${stats.winRate}%`} label="მოგება" />
              <Tile icon={Award} tone="text-indigo-300" value={stats.tournaments} label="ტურნირი" />
              <Tile icon={Trophy} tone="text-amber-400" value={stats.championships} label="თასი" />
              <Tile icon={Swords} tone="text-cyan-300" value={stats.games} label="მატჩი" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <Icon className={`h-4 w-4 ${tone}`} />
      <div className={`mt-1.5 text-[19px] font-black leading-none tabular-nums ${tone}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="mt-1 text-[9.5px] font-black uppercase tracking-[0.1em] text-white/40">{label}</div>
    </div>
  );
}
