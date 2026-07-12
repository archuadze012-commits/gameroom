"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, Users, Calendar, Dumbbell, Check, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { registerClanForTournamentAction, unregisterClanFromTournamentAction } from "./clan-feature-actions";

export type ClanTournament = {
  slug: string;
  name: string;
  status: string;
  isPractice: boolean;
  prizePool: string | null;
  current: number;
  max: number;
  startsAt: string | null;
  registered: boolean;
};

const STATUS_LABEL: Record<string, string> = { open: "რეგისტრაცია", checkin: "Check-in", live: "LIVE", completed: "დასრულდა" };

function fmt(iso: string | null) {
  if (!iso) return "გამოცხადდება";
  return new Date(iso).toLocaleString("ka-GE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// A registerable list of the clan-game's tournaments OR practice games. `kind`
// only drives the empty-state copy — competitive vs practice items are filtered
// by the caller.
export function ClanTournamentList({
  clanSlug,
  canRegister,
  items,
  kind,
}: {
  clanSlug: string;
  canRegister: boolean;
  items: ClanTournament[];
  kind: "tournaments" | "scrims";
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-14 text-center">
        {kind === "tournaments" ? (
          <Trophy className="mx-auto mb-3 h-8 w-8 text-white/20" />
        ) : (
          <Dumbbell className="mx-auto mb-3 h-8 w-8 text-white/20" />
        )}
        <p className="text-[13.5px] font-bold text-white/50">
          {kind === "tournaments" ? "ამ თამაშზე ჯერ ტურნირი არ არის" : "ამ თამაშზე ჯერ პრაქტიკული თამაში არ არის"}
        </p>
        <p className="mt-1 text-[12.5px] text-white/30">როცა გამოცხადდება, აქ დაარეგისტრირებ კლანს.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((t) => (
        <TournamentCard key={t.slug} clanSlug={clanSlug} canRegister={canRegister} t={t} />
      ))}
    </ul>
  );
}

function TournamentCard({ clanSlug, canRegister, t }: { clanSlug: string; canRegister: boolean; t: ClanTournament }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const act = (register: boolean) => {
    startTransition(async () => {
      const res = register
        ? await registerClanForTournamentAction(clanSlug, t.slug)
        : await unregisterClanFromTournamentAction(clanSlug, t.slug);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else toast.error(res.message);
    });
  };

  return (
    <li className="pubg-loadout-link block" data-variant={t.isPractice ? "support" : "royale"}>
      <div className="pubg-loadout-card relative overflow-hidden p-4">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className={`pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] ${t.isPractice ? "bg-cyan-500/70" : "bg-amber-500/80"}`} />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/tournaments/${t.slug}`} className="group min-w-0">
              <p className="flex items-center gap-1.5 truncate text-[14px] font-black text-white group-hover:text-amber-300">
                {t.name} <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
              </p>
            </Link>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${
              t.status === "live" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                : t.status === "open" ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                  : "border-white/10 bg-white/5 text-white/40"
            }`}>
              {STATUS_LABEL[t.status] ?? t.status}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-white/50">
            {!t.isPractice && (
              <span className="flex items-center gap-1 font-bold text-pink-400"><Trophy className="h-3.5 w-3.5" /> {t.prizePool || "—"}</span>
            )}
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t.current}/{t.max}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {fmt(t.startsAt)}</span>
          </div>

          {canRegister && (
            <div className="mt-3 border-t border-white/[0.06] pt-3">
              {t.registered ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-lg border border-[var(--gr-lime)]/30 bg-[var(--gr-lime)]/10 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-[var(--gr-lime)]">
                    <Check className="h-3.5 w-3.5" /> დარეგისტრირებული
                  </span>
                  {t.status === "open" && (
                    <button type="button" onClick={() => act(false)} disabled={isPending}
                      className="text-[11px] font-black uppercase tracking-wider text-white/40 transition-colors hover:text-red-400 disabled:opacity-50">
                      გაუქმება
                    </button>
                  )}
                </div>
              ) : t.status === "open" ? (
                <button type="button" onClick={() => act(true)} disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--gr-violet-hi)] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-white transition-all hover:brightness-110 disabled:opacity-50">
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />}
                  კლანის რეგისტრაცია
                </button>
              ) : (
                <span className="text-[11px] font-bold text-white/30">რეგისტრაცია დახურულია</span>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
