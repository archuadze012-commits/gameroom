import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users as UsersIcon, Plus, DoorOpen, Trophy, Radio, Mic, MapPin } from "lucide-react";
import { GameIcon } from "@/components/game-icon";
import { mockGames, mockLfgPosts, mockTournaments, type MockGame } from "@/lib/mock-data";
import { FindMatchButton } from "@/components/find-match-button";
import { FavoriteGameButton } from "@/components/favorite-game-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: dbGame } = await supabase.from("games").select("*").eq("slug", slug).single();

  const game: MockGame | undefined = dbGame
    ? {
        slug: dbGame.slug,
        nameKa: dbGame.name_ka,
        nameEn: dbGame.name_en,
        description: dbGame.description,
        accent: dbGame.accent,
        emoji: dbGame.emoji,
        iconUrl: dbGame.icon_url ?? undefined,
        coverUrl: dbGame.cover_url ?? undefined,
        players: 0,
        online: 0,
        liveLfg: 0,
        favoritedBy: 0,
      }
    : mockGames.find((g) => g.slug === slug);

  if (!game) notFound();

  const gameLfg = mockLfgPosts.filter((p) => p.gameSlug === slug);
  const gameTournaments = mockTournaments.filter((t) => t.gameSlug === slug);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      {/* ── CINEMATIC HERO ─────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-[var(--gr-border)]">
        <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${game.accent}`} />
        {game.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.coverUrl}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover"
            style={{ objectPosition: "top center" }}
          />
        )}
        {/* gradient overlay so subject isn't washed */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,6,15,0.55) 0%, rgba(8,6,15,0.4) 35%, rgba(8,6,15,0.85) 80%, var(--gr-bg-0) 100%)",
          }}
        />
        {/* vertical light pillars */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-[20%] w-[2px] motion-safe:animate-[gr-pillar_8s_ease-in-out_infinite]"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(139,92,246,0.45), transparent)",
            boxShadow: "0 0 30px rgba(139,92,246,0.4)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-[20%] w-[2px] motion-safe:animate-[gr-pillar_8s_ease-in-out_infinite]"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(192,38,211,0.45), transparent)",
            boxShadow: "0 0 30px rgba(192,38,211,0.4)",
          }}
        />

        <div className="container relative mx-auto px-4 pt-8 pb-12 lg:pt-10 lg:pb-16">
          <Link
            href="/games"
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> ყველა თამაში
          </Link>

          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div
                className="grid h-20 w-20 shrink-0 place-items-center bg-[var(--gr-bg-1)] shadow-[var(--gr-glow-violet)] ring-1 ring-[var(--gr-violet)]/60"
                style={{ clipPath: cutSm }}
              >
                <GameIcon game={game} size="xl" />
              </div>
              <div>
                <Eyebrow tone="amber">თამაში</Eyebrow>
                <DisplayHeading as="h1" size="display" className="mt-2 !text-white">
                  {game.nameKa}
                </DisplayHeading>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <FavoriteGameButton slug={game.slug} />
            </div>
          </div>

          {/* stats pill row */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Pill tone="online" icon={<Radio className="h-3 w-3" />}>
              {game.players.toLocaleString("en-US")} მოთამაშე
            </Pill>
            <Pill tone="violet" icon={<UsersIcon className="h-3 w-3" />}>
              {game.liveLfg} ცოცხალი LFG
            </Pill>
            {gameTournaments.length > 0 && (
              <Pill tone="amber" icon={<Trophy className="h-3 w-3" />}>
                {gameTournaments.length} ჩემპიონატი
              </Pill>
            )}
          </div>
        </div>
      </section>

      {/* ── BODY ─────────────────────────────────────────── */}
      <div className="container relative mx-auto px-4 py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-10">
            {/* description card */}
            <article
              className="relative isolate"
              style={{ background: cardBorder, padding: 1, clipPath: cutMd }}
            >
              <div className="bg-[var(--gr-bg-1)] p-6 gr-sweep" style={{ clipPath: cutMd }}>
                <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]" />
                <Eyebrow tone="violet">თამაშის შესახებ</Eyebrow>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--gr-text-mute)]">
                  {game.description}
                </p>
              </div>
            </article>

            {/* ── LFG ────────────────────────────────── */}
            <section>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <Eyebrow tone="amber">გუნდი</Eyebrow>
                  <DisplayHeading as="h2" size="md" className="mt-2">ცოცხალი LFG</DisplayHeading>
                </div>
                <div className="flex gap-2">
                  <FindMatchButton gameSlug={game.slug} gameName={game.nameKa} />
                  <ChevronButton href={`/lfg/new?game=${game.slug}`} variant="violet" size="sm">
                    <Plus className="h-3.5 w-3.5" /> ახალი LFG
                  </ChevronButton>
                </div>
              </div>
              <div className="space-y-3">
                {gameLfg.length === 0 ? (
                  <EmptyState
                    tone="violet"
                    illustration={<UsersIcon className="h-8 w-8 text-[var(--gr-violet-hi)]" />}
                    title="ჯერ LFG არ არის"
                    description="გახდი პირველი ვინც დაიწყებს ძებნას ამ თამაშზე."
                    action={
                      <ChevronButton href={`/lfg/new?game=${game.slug}`} variant="violet" size="md">
                        <Plus className="h-4 w-4" /> ახალი LFG
                      </ChevronButton>
                    }
                  />
                ) : (
                  gameLfg.map((p) => (
                    <Link key={p.id} href={`/lfg/${p.id}`} className="block">
                      <article
                        className="group relative isolate transition-transform hover:-translate-y-0.5"
                        style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
                      >
                        <div
                          className="relative bg-[var(--gr-bg-1)] p-4 gr-sweep"
                          style={{ clipPath: cutSm }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-display text-[15px] font-bold uppercase tracking-tight text-[var(--gr-text)] group-hover:text-[var(--gr-violet-hi)]">
                                {p.title}
                              </h3>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">
                                @{p.authorName} · {p.createdAgo}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <Pill tone="amber">🏅 Crown II</Pill>
                                <Pill tone="violet" icon={<Mic className="h-3 w-3" />}>Mic</Pill>
                                <Pill tone="cyan" icon={<MapPin className="h-3 w-3" />}>EU</Pill>
                              </div>
                            </div>
                            <Pill tone="accent" icon={<UsersIcon className="h-3 w-3" />}>
                              {p.slots.filled}/{p.slots.total}
                            </Pill>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {/* ── ROOMS ──────────────────────────────── */}
            <section>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <Eyebrow tone="magenta">სივრცე</Eyebrow>
                  <DisplayHeading as="h2" size="md" className="mt-2">რუმები</DisplayHeading>
                </div>
                <ChevronButton href={`/rooms/new?game=${game.slug}`} variant="ghost" size="sm">
                  <Plus className="h-3.5 w-3.5" /> ახალი რუმი
                </ChevronButton>
              </div>
              <EmptyState
                tone="magenta"
                illustration={<DoorOpen className="h-9 w-9 text-[var(--gr-magenta)]" />}
                title="ამ თამაშზე ჯერ რუმი არ არის"
                description="შექმენი პირველი და მოიწვიე გუნდი."
                action={
                  <ChevronButton href={`/rooms/new?game=${game.slug}`} variant="violet" size="md">
                    <Plus className="h-4 w-4" /> შექმენი რუმი
                  </ChevronButton>
                }
              />
            </section>

            {/* ── TOURNAMENTS ───────────────────────── */}
            <section>
              <div className="mb-5">
                <Eyebrow tone="amber">ჩემპიონატი</Eyebrow>
                <DisplayHeading as="h2" size="md" className="mt-2">ტურნირები</DisplayHeading>
              </div>
              <div className="space-y-3">
                {gameTournaments.length === 0 ? (
                  <EmptyState
                    tone="amber"
                    illustration={<Trophy className="h-8 w-8 text-[var(--gr-amber)]" />}
                    title="დაგეგმილი ჩემპიონატი ვერ მოიძებნა"
                    description="ჩემპიონატის შემოთავაზება შესაძლებელია /tournaments-დან."
                  />
                ) : (
                  gameTournaments.map((t) => (
                    <Link key={t.slug} href={`/tournaments/${t.slug}`} className="block">
                      <article
                        className="relative isolate transition-transform hover:-translate-y-0.5"
                        style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
                      >
                        <div className="relative bg-[var(--gr-bg-1)] gr-sweep" style={{ clipPath: cutSm }}>
                          <div className={`h-2 w-full bg-gradient-to-r ${t.banner}`} />
                          <div className="flex items-center justify-between gap-3 p-4">
                            <div>
                              <h3 className="font-display text-[15px] font-bold uppercase tracking-tight text-[var(--gr-text)] hover:text-[var(--gr-violet-hi)]">
                                {t.name}
                              </h3>
                              <div className="mt-1.5 flex items-center gap-2 text-[11.5px] text-[var(--gr-text-mute)]">
                                <Trophy className="h-3 w-3 text-[var(--gr-amber)]" />
                                <span className="font-semibold tabular-nums text-[var(--gr-amber)]">{t.prizePool}</span>
                                <span>·</span>
                                <span>{t.startsAt}</span>
                              </div>
                            </div>
                            <Pill tone="amber">{t.status}</Pill>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* ── SIDEBAR ─────────────────────────────── */}
          <aside className="space-y-5">
            <section
              className="relative isolate"
              style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
            >
              <div className="bg-[var(--gr-bg-1)] p-5" style={{ clipPath: cutSm }}>
                <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]" />
                {/* amber corner notch */}
                <span
                  aria-hidden
                  className="absolute right-0 top-0 h-3 w-10 bg-[var(--gr-amber)]"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
                />
                <Eyebrow tone="amber">პროფილი</Eyebrow>
                <h3 className="mt-2 font-display text-[16px] font-bold uppercase text-[var(--gr-text)]">ჩემი ID</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--gr-text-mute)]">
                  დაამატე შენი in-game ID, რომ მოთამაშეებმა გიპოვონ.
                </p>
                <div className="mt-4">
                  <ChevronButton href="/settings" variant="violet" size="sm">დამატება</ChevronButton>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
