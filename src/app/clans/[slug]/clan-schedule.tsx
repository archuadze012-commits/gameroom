"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Dumbbell, Swords, Check, X, HelpCircle, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { rsvpClanFixtureAction } from "./clan-schedule-actions";

export type ScheduleFixture = {
  tournamentId: string;
  name: string;
  slug: string;
  isPractice: boolean;
  status: string;
  startsAt: string | null;
  counts: { in: number; out: number; maybe: number };
  viewerStatus: "in" | "out" | "maybe" | null;
  attendeesIn: { name: string; avatar: string | null; username: string }[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: "მზადება",
  open: "ღია რეგისტრაცია",
  checkin: "Check-in",
  live: "მიმდინარე",
};

function fmt(iso: string | null) {
  if (!iso) return "თარიღი დასაზუსტებელია";
  return new Date(iso).toLocaleString("ka-GE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ClanSchedule({
  clanSlug,
  isMember,
  fixtures,
}: {
  clanSlug: string;
  isMember: boolean;
  fixtures: ScheduleFixture[];
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();

  const rsvp = (tournamentId: string, status: "in" | "out" | "maybe") => {
    start(async () => {
      const res = await rsvpClanFixtureAction(clanSlug, tournamentId, status);
      if (res.success) router.refresh();
      else toast.error(res.message ?? "ვერ მოხერხდა");
    });
  };

  if (fixtures.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-10 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-white/20" />
        <p className="mt-3 text-[13px] text-white/45">ჯერ დაგეგმილი ფიქსტურა არ არის.</p>
        <p className="mt-1 text-[12px] text-white/30">დარეგისტრირდი ტურნირზე ან scrim-ზე — ავტომატურად გამოჩნდება აქ.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fixtures.map((f) => {
        const Icon = f.isPractice ? Dumbbell : Swords;
        const tone = f.isPractice ? "text-cyan-300" : "text-amber-300";
        const rail = f.isPractice ? "bg-cyan-500/70" : "bg-amber-500/80";
        return (
          <div key={f.tournamentId} className="pubg-loadout-link block" data-variant="strike">
            <div className="pubg-loadout-card relative overflow-hidden p-4">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <span aria-hidden className={`pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] ${rail}`} />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-[0.14em] ${tone}`}>{f.isPractice ? "სკრიმი" : "ტურნირი"}</span>
                        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-white/50">
                          {STATUS_LABEL[f.status] ?? f.status}
                        </span>
                      </div>
                      <Link href={`/tournaments/${f.slug}`} className="mt-0.5 flex items-center gap-1 text-[14px] font-black text-white hover:text-amber-200">
                        {f.name} <ArrowUpRight className="h-3.5 w-3.5 text-white/40" />
                      </Link>
                      <div className="mt-0.5 text-[11.5px] font-bold text-white/50">{fmt(f.startsAt)}</div>
                    </div>
                  </div>
                </div>

                {/* Availability */}
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-3 text-[11px] font-black">
                    <span className="flex items-center gap-1 text-[var(--gr-lime)]"><Check className="h-3.5 w-3.5" /> {f.counts.in}</span>
                    <span className="flex items-center gap-1 text-amber-300"><HelpCircle className="h-3.5 w-3.5" /> {f.counts.maybe}</span>
                    <span className="flex items-center gap-1 text-white/40"><X className="h-3.5 w-3.5" /> {f.counts.out}</span>
                  </div>
                  {f.attendeesIn.length > 0 && (
                    <div className="flex -space-x-2">
                      {f.attendeesIn.slice(0, 6).map((a) => (
                        <Avatar key={a.username} className="h-6 w-6 border-2 border-[var(--gr-bg-elev-1)]" title={a.name}>
                          <AvatarImage src={a.avatar ?? undefined} className="object-cover" />
                          <AvatarFallback className="text-[8px]">{a.name.slice(0, 1)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  )}
                  {isMember && (
                    <div className="ml-auto flex overflow-hidden rounded-lg border border-white/10">
                      {([
                        { k: "in", label: "მოვდივარ", on: "bg-[var(--gr-lime)]/20 text-[var(--gr-lime)]" },
                        { k: "maybe", label: "ეგება", on: "bg-amber-500/20 text-amber-300" },
                        { k: "out", label: "ვერ", on: "bg-white/10 text-white/60" },
                      ] as const).map((b) => (
                        <button
                          key={b.k}
                          type="button"
                          disabled={isPending}
                          onClick={() => rsvp(f.tournamentId, b.k)}
                          className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                            f.viewerStatus === b.k ? b.on : "text-white/40 hover:text-white/70"
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
