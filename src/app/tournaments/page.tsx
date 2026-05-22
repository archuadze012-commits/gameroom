import Link from "next/link";
import { Trophy, Users, Calendar, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { ChevronButton } from "@/components/ui/chevron-button";
import { mockGames, mockTournaments } from "@/lib/mock-data";

export const metadata = { title: "ჩემპიონატები" };

const statusTone: Record<string, "online" | "amber" | "live" | "neutral"> = {
  open:      "online",
  checkin:   "amber",
  live:      "live",
  completed: "neutral",
};
const statusLabel: Record<string, string> = {
  open: "რეგისტრაცია",
  checkin: "Check-in",
  live: "ცოცხალი",
  completed: "დასრულდა",
};

const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

export default function TournamentsPage() {
  const grouped = {
    live: mockTournaments.filter((t) => t.status === "live"),
    upcoming: mockTournaments.filter((t) => t.status === "open" || t.status === "checkin"),
    completed: mockTournaments.filter((t) => t.status === "completed"),
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14">
        <PageHeader
          eyebrow="ჩემპიონატები"
          title="ტურნირები"
          description="თემიდან გასული ჩემპიონატები. დარეგისტრირდი, უყურე, მოიგე."
          actions={
            <ChevronButton href="/tournaments/propose" variant="ghost" size="md">
              <Plus className="h-4 w-4" /> შემოთავაზება
            </ChevronButton>
          }
        />

        <div className="mt-10 space-y-12">
          <Section eyebrow="LIVE" title="ცოცხალი" tone="live" tournaments={grouped.live} />
          <Section eyebrow="მომავალი" title="დარეგისტრირდი" tone="amber" tournaments={grouped.upcoming} />
          <Section eyebrow="არქივი" title="დასრულებული" tone="mute" tournaments={grouped.completed} />
        </div>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  tone,
  tournaments,
}: {
  eyebrow: string;
  title: string;
  tone: "live" | "amber" | "mute";
  tournaments: typeof mockTournaments;
}) {
  if (tournaments.length === 0) return null;
  const eyebrowTone = tone === "live" ? "magenta" : tone === "amber" ? "amber" : "mute";
  return (
    <section>
      <div className="mb-5">
        <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>
        <h2 className="mt-2 font-display text-[22px] font-extrabold uppercase tracking-tight text-[var(--gr-text)]">
          {title}
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => {
          const game = mockGames.find((g) => g.slug === t.gameSlug);
          const sTone = statusTone[t.status] ?? "neutral";
          const sLabel = statusLabel[t.status] ?? t.status;
          const fillPct = Math.min(100, Math.round((t.participants.current / t.participants.max) * 100));
          return (
            <Link key={t.slug} href={`/tournaments/${t.slug}`} className="group block">
              <article
                className="relative isolate h-full transition-transform duration-200 hover:-translate-y-1"
                style={{ background: cardBorder, padding: 1, clipPath: cutMd }}
              >
                <div className="relative h-full bg-[var(--gr-bg-1)] gr-sweep" style={{ clipPath: cutMd }}>
                  {/* banner ribbon */}
                  <div className={`h-2.5 w-full bg-gradient-to-r ${t.banner}`} />

                  <div className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <Pill tone="neutral">{game?.emoji} {game?.nameKa}</Pill>
                      <Pill tone={sTone} pulse={t.status === "live"}>{sLabel}</Pill>
                    </div>

                    <h3 className="font-display text-[17px] font-bold uppercase tracking-tight text-[var(--gr-text)] group-hover:text-[var(--gr-violet-hi)]">
                      {t.name}
                    </h3>

                    <div className="space-y-2 text-[12.5px] text-[var(--gr-text-mute)]">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-3.5 w-3.5 text-[var(--gr-amber)]" />
                        <span className="font-display text-[15px] font-bold tabular-nums text-[var(--gr-amber)]">{t.prizePool}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-[var(--gr-violet-hi)]" />
                        <span className="tabular-nums">{t.participants.current}/{t.participants.max}</span> მონაწილე
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-[var(--gr-cyan-glow)]" />
                        {t.startsAt}
                      </div>
                    </div>

                    {/* registration progress */}
                    <div className="space-y-1">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--gr-bg-2)]">
                        <div
                          className="h-full bg-[var(--gr-grad-violet)] transition-all"
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--gr-text-dim)]">
                        <span>{t.format}</span>
                        <span className="tabular-nums">{fillPct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
