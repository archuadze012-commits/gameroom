"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Swords, Trophy, ArrowUpRight } from "lucide-react";

export type ClanMatchRow = {
  id: string;
  opponentName: string;
  result: "win" | "loss" | "draw";
  ourScore: number | null;
  theirScore: number | null;
  isPractice: boolean;
  playedAt: string;
  tournamentName: string | null;
  tournamentSlug: string | null;
};

const RESULT_META: Record<string, { label: string; short: string; tone: string; bg: string; dot: string }> = {
  win: { label: "მოგება", short: "W", tone: "text-[var(--gr-lime)]", bg: "bg-[var(--gr-lime)]/15 border-[var(--gr-lime)]/30", dot: "bg-[var(--gr-lime)]" },
  loss: { label: "წაგება", short: "L", tone: "text-red-400", bg: "bg-red-500/15 border-red-500/30", dot: "bg-red-500" },
  draw: { label: "ფრე", short: "D", tone: "text-white/60", bg: "bg-white/10 border-white/20", dot: "bg-white/40" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ka-GE", { day: "numeric", month: "short", year: "numeric" });
}

export function ClanMatchesLog({ matches, powerRating }: { matches: ClanMatchRow[]; powerRating?: number | null }) {
  const { w, l, d, form, rivals } = useMemo(() => {
    let w = 0, l = 0, d = 0;
    for (const m of matches) {
      if (m.result === "win") w++;
      else if (m.result === "loss") l++;
      else d++;
    }
    const form = matches.slice(0, 5).map((m) => m.result); // newest first
    const map = new Map<string, { name: string; w: number; l: number; d: number; n: number }>();
    for (const m of matches) {
      const key = m.opponentName.trim().toLowerCase();
      const r = map.get(key) ?? { name: m.opponentName, w: 0, l: 0, d: 0, n: 0 };
      r.n++;
      if (m.result === "win") r.w++;
      else if (m.result === "loss") r.l++;
      else r.d++;
      map.set(key, r);
    }
    const rivals = [...map.values()].sort((a, b) => b.n - a.n).slice(0, 4);
    return { w, l, d, form, rivals };
  }, [matches]);

  const total = w + l + d;
  const winRate = total > 0 ? Math.round((w / total) * 100) : 0;

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-10 text-center">
        <Swords className="mx-auto h-8 w-8 text-white/20" />
        <p className="mt-3 text-[13px] text-white/45">ჯერ დასრულებული მატჩი არ არის.</p>
        <p className="mt-1 text-[12px] text-white/30">ტურნირებში/scrim-ებში ნათამაშები მატჩები ავტომატურად აქ გამოჩნდება.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Record summary */}
      <div className="pubg-loadout-link block" data-variant="strike">
        <div className="pubg-loadout-card relative overflow-hidden p-5">
          <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
          <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-indigo-500/80" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div>
                <div className="text-[26px] font-black leading-none tabular-nums text-white">
                  {w}<span className="text-white/30">-</span>{l}<span className="text-white/30">-</span>{d}
                </div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">W · L · D</div>
              </div>
              <div>
                <div className="text-[26px] font-black leading-none tabular-nums text-[var(--gr-lime)]">{winRate}%</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">მოგება</div>
              </div>
              {powerRating != null && (
                <div>
                  <div className="text-[26px] font-black leading-none tabular-nums text-[var(--gr-violet-hi)]">{powerRating}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">Power</div>
                </div>
              )}
            </div>
            {form.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">ფორმა</span>
                <div className="flex flex-row-reverse gap-1.5">
                  {form.map((r, i) => (
                    <span key={i} title={RESULT_META[r].label} className={`grid h-6 w-6 place-items-center rounded-md text-[10px] font-black text-black ${RESULT_META[r].dot}`}>
                      {RESULT_META[r].short}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {rivals.length > 0 && (
            <div className="relative z-10 mt-4 border-t border-white/[0.06] pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                <Trophy className="h-3.5 w-3.5" /> რივალები
              </div>
              <div className="flex flex-wrap gap-2">
                {rivals.map((r) => (
                  <span key={r.name} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11.5px]">
                    <span className="font-bold text-white/80">{r.name}</span>
                    <span className="font-black tabular-nums text-white/50">{r.w}-{r.l}-{r.d}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Match list */}
      <div className="space-y-2.5">
        {matches.map((m) => {
          const meta = RESULT_META[m.result];
          const inner = (
            <div className="pubg-loadout-card relative overflow-hidden p-4">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <div className="relative z-10 flex items-center gap-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-[15px] font-black ${meta.bg} ${meta.tone}`}>
                  {meta.short}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-black text-white">vs {m.opponentName}</span>
                    {!m.isPractice && (
                      <span className="shrink-0 rounded border border-amber-500/25 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-amber-300/80">ოფიც.</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/45">
                    <span>{fmtDate(m.playedAt)}</span>
                    {m.tournamentName && (
                      <>
                        <span className="text-white/25">·</span>
                        <span className="truncate">{m.tournamentName}</span>
                        <ArrowUpRight className="h-3 w-3 text-white/30" />
                      </>
                    )}
                  </div>
                </div>
                {(m.ourScore !== null || m.theirScore !== null) && (
                  <span className="shrink-0 text-[16px] font-black tabular-nums text-white">
                    {m.ourScore ?? "–"}<span className="text-white/30">:</span>{m.theirScore ?? "–"}
                  </span>
                )}
              </div>
            </div>
          );
          return m.tournamentSlug ? (
            <Link key={m.id} href={`/tournaments/${m.tournamentSlug}`} className="pubg-loadout-link block" data-variant="strike">
              {inner}
            </Link>
          ) : (
            <div key={m.id} className="pubg-loadout-link block" data-variant="strike">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
