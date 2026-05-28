import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Users as UsersIcon,
  Plus,
  Crosshair,
  DoorOpen,
  Flame,
  Swords,
  Target,
  Shield,
  Star,
  Trophy,
  Radio,
  Mic,
  MapPin,
  Rocket,
  Gift,
  Headphones,
} from "lucide-react";
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
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";
const LOBBY_GAMES = new Set<string>(["pubg-mobile"]);

type RoomPreview = {
  id: string;
  room_code: string;
  mode: string;
  map: string | null;
  perspective: string;
  max_players: number;
  current_players: number;
  host_id: string;
};

type PromoCardProps = {
  href: string;
  title: string;
  icon: React.ReactNode;
  accent: string;
};

function PromoCard({ href, title, icon, accent }: PromoCardProps) {
  return (
    <Link href={href} className="block">
      <article
        className="group relative isolate"
        style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
      >
        <div
          className="relative h-56 overflow-hidden bg-[var(--gr-bg-1)] transition-transform duration-300 group-hover:scale-[1.01]"
          style={{ clipPath: cutSm }}
        >
          <span aria-hidden className="absolute left-0 top-0 z-10 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
          <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
          <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-65`} />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/30 to-transparent" />
          <div aria-hidden className="absolute -left-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-white/10 blur-3xl transition-transform duration-500 group-hover:scale-125" />
          <div aria-hidden className="absolute inset-y-0 right-[22%] w-[2px] bg-[var(--gr-violet)]/50 shadow-[0_0_18px_rgba(139,92,246,0.65)]" />
          <div aria-hidden className="absolute inset-y-0 right-[18%] w-[4px] bg-[var(--gr-violet)]/65 shadow-[0_0_22px_rgba(139,92,246,0.8)]" />
          <div aria-hidden className="absolute right-0 top-0 h-full w-[18%] bg-[linear-gradient(180deg,rgba(34,211,238,0.9),rgba(139,92,246,0.25))] opacity-80 [clip-path:polygon(32%_0,100%_0,100%_100%,0_100%)]" />
          <div className="absolute inset-y-0 right-[11%] z-[1] flex items-center justify-center">
            <div className="rounded-full border border-white/12 bg-white/[0.04] p-5 shadow-[0_0_30px_rgba(139,92,246,0.3)] backdrop-blur-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 sm:p-6">
              <div className="text-white/95 drop-shadow-[0_0_18px_rgba(34,211,238,0.45)] [&_svg]:h-16 [&_svg]:w-16 sm:[&_svg]:h-20 sm:[&_svg]:w-20">
                {icon}
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
            <h3 className="font-display text-[20px] font-extrabold uppercase leading-[1.02] tracking-tight text-[var(--gr-text)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
              {title}
            </h3>
          </div>
        </div>
      </article>
    </Link>
  );
}

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
    : mockGames.find((entry) => entry.slug === slug);

  if (!game) notFound();

  const gameLfg = mockLfgPosts.filter((post) => post.gameSlug === slug);
  const gameTournaments = mockTournaments.filter((entry) => entry.gameSlug === slug);
  const hasLobby = LOBBY_GAMES.has(game.slug);

  const { data: roomsRaw } = await supabase
    .from("game_rooms")
    .select("id, room_code, mode, map, perspective, max_players, current_players, host_id")
    .eq("game_slug", slug)
    .eq("status", "open")
    .gt("expires_at", new Date().toISOString())
    .limit(30);

  let topRooms = (roomsRaw ?? []) as RoomPreview[];

  if (topRooms.length > 1) {
    const hostIds = [...new Set(topRooms.map((room) => room.host_id))];
    const { data: followRows } = await supabase.from("follows").select("following_id").in("following_id", hostIds);
    const followCountMap: Record<string, number> = {};
    (followRows ?? []).forEach((row) => {
      followCountMap[row.following_id] = (followCountMap[row.following_id] || 0) + 1;
    });
    topRooms = [...topRooms].sort((a, b) => (followCountMap[b.host_id] || 0) - (followCountMap[a.host_id] || 0));
  }

  topRooms = topRooms.slice(0, 3);

  const featuredRoom = topRooms[0] ?? null;
  const featuredTournament = gameTournaments[0] ?? null;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      {game.coverUrl && (
        <div className="relative h-48 overflow-hidden border-b border-[var(--gr-border)] sm:h-56 lg:h-64">
          <div className={`absolute inset-0 bg-gradient-to-br ${game.accent}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={game.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "top center" }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(8,6,15,0.2) 0%, rgba(8,6,15,0.6) 100%)" }}
          />
        </div>
      )}

      <div className="container relative mx-auto px-4 py-8 lg:py-10">
        <Link
          href="/games"
          className="mb-6 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> ყველა თამაში
        </Link>

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div
              className="grid h-20 w-20 shrink-0 place-items-center bg-[var(--gr-bg-1)] shadow-[var(--gr-glow-violet)] ring-1 ring-[var(--gr-violet)]/60"
              style={{ clipPath: cutSm }}
            >
              <GameIcon game={game} size="xl" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <DisplayHeading as="h1" size="display">
                  {game.nameKa}
                </DisplayHeading>
                {hasLobby && (
                  <Link
                    href={`/games/${game.slug}/lobby`}
                    className="group relative inline-flex items-center gap-2 overflow-hidden bg-[linear-gradient(135deg,rgba(139,92,246,0.22),rgba(192,38,211,0.3))] px-4 py-2 text-white ring-1 ring-[var(--gr-violet-hi)]/45 shadow-[0_10px_30px_-12px_rgba(139,92,246,0.8)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:ring-[var(--gr-amber)]/55 hover:shadow-[0_0_28px_rgba(192,38,211,0.45)] sm:px-5 sm:py-2.5 lg:px-6 lg:py-3"
                    style={{ clipPath: cutSm }}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.18)_35%,transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                    <Rocket className="relative z-[1] h-5 w-5 shrink-0 text-[var(--gr-amber)] drop-shadow-[0_0_10px_rgba(245,158,11,0.55)] sm:h-7 sm:w-7 lg:h-9 lg:w-9" />
                    <span className="relative z-[1] font-display text-[26px] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] sm:text-[36px] lg:text-[52px]">
                      ლობის გახსნა
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <FavoriteGameButton slug={game.slug} />
          </div>
        </div>

        <div className="mb-10 flex flex-wrap items-center gap-2">
          <Pill tone="online" icon={<Radio className="h-3 w-3" />}>
            {game.players.toLocaleString("en-US")} მოთამაშე
          </Pill>
          <Pill tone="violet" icon={<UsersIcon className="h-3 w-3" />}>
            {game.liveLfg} LIVE ლოკალი
          </Pill>
          {gameTournaments.length > 0 && (
            <Pill tone="amber" icon={<Trophy className="h-3 w-3" />}>
              {gameTournaments.length} ტურნირი
            </Pill>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-10">
            <section>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <Eyebrow tone="amber">გუნდი</Eyebrow>
                  <DisplayHeading as="h2" size="md" className="mt-2">
                    იპოვე თიმმეითი ან ეთამაშე ერთი ერთზე
                  </DisplayHeading>
                </div>
                <div className="flex gap-2">
                  <FindMatchButton gameSlug={game.slug} gameName={game.nameKa} />
                  <ChevronButton href={`/lfg/new?game=${game.slug}`} variant="violet" size="sm">
                    <Plus className="h-3.5 w-3.5" /> ახალი ლოკალი
                  </ChevronButton>
                </div>
              </div>
              <div className="space-y-3">
                {gameLfg.length === 0 ? (
                  <EmptyState
                    tone="violet"
                    illustration={<UsersIcon className="h-8 w-8 text-[var(--gr-violet-hi)]" />}
                    title="ჯერ ლოკალი არ არის"
                    description="გახდი პირველი ვინც დაიწყებს ძებნას ამ თამაშზე."
                    action={
                      <ChevronButton href={`/lfg/new?game=${game.slug}`} variant="violet" size="md">
                        <Plus className="h-4 w-4" /> ახალი ლოკალი
                      </ChevronButton>
                    }
                  />
                ) : (
                  gameLfg.map((post) => (
                    <Link key={post.id} href={`/lfg/${post.id}`} className="block">
                      <article
                        className="group relative isolate transition-transform hover:-translate-y-0.5"
                        style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
                      >
                        <div className="relative bg-[var(--gr-bg-1)] p-4 gr-sweep" style={{ clipPath: cutSm }}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-display text-[15px] font-bold uppercase tracking-tight text-[var(--gr-text)] group-hover:text-[var(--gr-violet-hi)]">
                                {post.title}
                              </h3>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">
                                @{post.authorName} · {post.createdAgo}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <Pill tone="amber">🏅 Crown II</Pill>
                                <Pill tone="violet" icon={<Mic className="h-3 w-3" />}>Mic</Pill>
                                <Pill tone="cyan" icon={<MapPin className="h-3 w-3" />}>EU</Pill>
                              </div>
                            </div>
                            <Pill tone="accent" icon={<UsersIcon className="h-3 w-3" />}>
                              {post.slots.filled}/{post.slots.total}
                            </Pill>
                          </div>
                        </div>
                      </article>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="mb-5">
                <Eyebrow tone="magenta">შემდეგი ნაბიჯი</Eyebrow>
                <DisplayHeading as="h2" size="md" className="mt-2">
                  რუმები, ტურნირები და გათამაშებები
                </DisplayHeading>
              </div>
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                <Link href="/clans" className="block">
                  <article
                    className="group relative isolate h-full"
                    style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
                  >
                    <div
                      className="relative overflow-hidden bg-[var(--gr-bg-1)] px-5 py-5 h-full transition-transform duration-300 group-hover:scale-[1.005] sm:px-6"
                      style={{ clipPath: cutSm }}
                    >
                      <span aria-hidden className="absolute left-0 top-0 z-10 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-cyan-500/20" />
                      <div className="absolute inset-y-0 right-0 w-28 bg-[linear-gradient(180deg,rgba(34,211,238,0.5),rgba(139,92,246,0.12))] [clip-path:polygon(28%_0,100%_0,100%_100%,0_100%)]" />
                      <div className="relative z-[1] flex items-center justify-between gap-4 h-full">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-violet-hi)]/85">
                            CLAN HUB
                          </p>
                          <h3 className="mt-2 font-display text-[24px] font-extrabold uppercase tracking-tight text-[var(--gr-text)]">
                            კლანის გვერდი
                          </h3>
                        </div>
                        <div className="rounded-full border border-white/12 bg-white/[0.04] p-4 shadow-[0_0_30px_rgba(139,92,246,0.24)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                          <Shield className="h-9 w-9 text-white/95 drop-shadow-[0_0_18px_rgba(34,211,238,0.4)]" />
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>

                <Link href={`/games/${game.slug}/discordvoicechannels`} className="block">
                  <article
                    className="group relative isolate h-full"
                    style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
                  >
                    <div
                      className="relative overflow-hidden bg-[var(--gr-bg-1)] px-5 py-5 h-full transition-transform duration-300 group-hover:scale-[1.005] sm:px-6"
                      style={{ clipPath: cutSm }}
                    >
                      <span aria-hidden className="absolute left-0 top-0 z-10 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-cyan-500/20" />
                      <div className="absolute inset-y-0 right-0 w-28 bg-[linear-gradient(180deg,rgba(34,211,238,0.5),rgba(139,92,246,0.12))] [clip-path:polygon(28%_0,100%_0,100%_100%,0_100%)]" />
                      <div className="relative z-[1] flex items-center justify-between gap-4 h-full">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-violet-hi)]/85">
                            DISCORD VOICE
                          </p>
                          <h3 className="mt-2 font-display text-[24px] font-extrabold uppercase tracking-tight text-[var(--gr-text)]">
                            ხმოვანი ოთახები
                          </h3>
                        </div>
                        <div className="rounded-full border border-white/12 bg-white/[0.04] p-4 shadow-[0_0_30px_rgba(139,92,246,0.24)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                          <Headphones className="h-9 w-9 text-white/95 drop-shadow-[0_0_18px_rgba(34,211,238,0.4)]" />
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <PromoCard
                  href="/lfg?mode=classic"
                  title="კლასიკები"
                  icon={<Crosshair />}
                  accent="from-violet-500/25 to-sky-500/10"
                />
                <PromoCard
                  href="/lfg?mode=ultimate-royale"
                  title="ULTIMATE ROYALE"
                  icon={<Flame />}
                  accent="from-orange-500/25 to-red-500/10"
                />
                <PromoCard
                  href="/lfg?mode=1v1"
                  title="1 VS 1"
                  icon={<Swords />}
                  accent="from-amber-500/25 to-red-500/10"
                />
                <PromoCard
                  href={featuredRoom ? `/rooms/${featuredRoom.room_code}` : `/rooms/new?game=${game.slug}`}
                  title={featuredRoom ? `ROOM ${featuredRoom.mode.toUpperCase()}` : "ROOM სტრიმები"}
                  icon={<DoorOpen />}
                  accent="from-violet-500/25 to-cyan-500/10"
                />
                <PromoCard
                  href="/lfg?mode=practice"
                  title="პრაქტიკული თამაშები"
                  icon={<Target />}
                  accent="from-emerald-500/25 to-cyan-500/10"
                />
                <PromoCard
                  href="/free-pc-games"
                  title="გათამაშებები"
                  icon={<Gift />}
                  accent="from-cyan-500/25 to-fuchsia-500/10"
                />
                <PromoCard
                  href="/tournaments"
                  title={featuredTournament ? "ტურნირები" : "ახალი ბრაკეტი"}
                  icon={<Trophy />}
                  accent="from-amber-500/25 to-orange-500/10"
                />
                <PromoCard
                  href="/leaderboard"
                  title="რეიტინგი"
                  icon={<Star />}
                  accent="from-sky-500/25 to-violet-500/10"
                />
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="relative isolate" style={{ background: cardBorder, padding: 1, clipPath: cutSm }}>
              <div className="bg-[var(--gr-bg-1)] p-5" style={{ clipPath: cutSm }}>
                <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]" />
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
