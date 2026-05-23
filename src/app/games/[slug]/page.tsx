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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadge, type UserRole } from "@/components/role-badge";

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

  // Fetch open rooms for this game, sorted by host follower count
  type RoomPreview = {
    id: string; room_code: string; mode: string; map: string | null;
    perspective: string; max_players: number; current_players: number; host_id: string;
    profiles: { username: string | null; display_name: string | null; avatar_url: string | null; role: string | null } | null;
  };
  const { data: roomsRaw } = await supabase
    .from("game_rooms")
    .select("id, room_code, mode, map, perspective, max_players, current_players, host_id, profiles!game_rooms_host_id_fkey(username, display_name, avatar_url, role)")
    .eq("game_slug", slug)
    .eq("status", "open")
    .gt("expires_at", new Date().toISOString())
    .limit(30);
  let topRooms = (roomsRaw ?? []) as unknown as RoomPreview[];
  if (topRooms.length > 1) {
    const hostIds = [...new Set(topRooms.map((r) => r.host_id))];
    const { data: fc } = await supabase.from("follows").select("following_id").in("following_id", hostIds);
    const fcMap: Record<string, number> = {};
    (fc ?? []).forEach((f) => { fcMap[f.following_id] = (fcMap[f.following_id] || 0) + 1; });
    topRooms = [...topRooms].sort((a, b) => (fcMap[b.host_id] || 0) - (fcMap[a.host_id] || 0));
  }
  topRooms = topRooms.slice(0, 3);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      {/* ── COVER IMAGE ─────────────────────────────────── */}
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

      {/* ── BODY ─────────────────────────────────────────── */}
      <div className="container relative mx-auto px-4 py-8 lg:py-10">
        {/* breadcrumb */}
        <Link
          href="/games"
          className="mb-6 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> ყველა თამაში
        </Link>

        {/* game header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div
              className="grid h-20 w-20 shrink-0 place-items-center bg-[var(--gr-bg-1)] shadow-[var(--gr-glow-violet)] ring-1 ring-[var(--gr-violet)]/60"
              style={{ clipPath: cutSm }}
            >
              <GameIcon game={game} size="xl" />
            </div>
            <div>
              <DisplayHeading as="h1" size="display">
                {game.nameKa}
              </DisplayHeading>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <FavoriteGameButton slug={game.slug} />
          </div>
        </div>

        {/* stats pill row */}
        <div className="mb-10 flex flex-wrap items-center gap-2">
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

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-10">
            {/* ── LFG ────────────────────────────────── */}
            <section>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <Eyebrow tone="amber">გუნდი</Eyebrow>
                  <DisplayHeading as="h2" size="md" className="mt-2">იპოვე თიმმეითი ან ეთამაშე ერთი ერთზე</DisplayHeading>
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
                  ყველა
                </ChevronButton>
              </div>
              {topRooms.length === 0 ? (
                <EmptyState
                  tone="violet"
                  illustration={<DoorOpen className="h-9 w-9 text-[var(--gr-magenta)]" />}
                  title="ამ თამაშზე ჯერ რუმი არ არის"
                  description="შექმენი პირველი და მოიწვიე გუნდი."
                  action={
                    <ChevronButton href={`/rooms/new?game=${game.slug}`} variant="violet" size="md">
                      <Plus className="h-4 w-4" /> შექმენი რუმი
                    </ChevronButton>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {topRooms.map((room) => {
                    const host = room.profiles;
                    const name = host?.display_name ?? host?.username ?? "მომხმარებელი";
                    const initial = name.slice(0, 1).toUpperCase();
                    return (
                      <Link key={room.id} href={`/rooms/${room.room_code}`} className="block">
                        <article
                          className="group relative isolate transition-transform hover:-translate-y-0.5"
                          style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
                        >
                          <div className="relative bg-[var(--gr-bg-1)] p-4 gr-sweep" style={{ clipPath: cutSm }}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="h-9 w-9 shrink-0 border border-[var(--gr-border-hi)]">
                                  <AvatarImage src={host?.avatar_url ?? undefined} alt={name} />
                                  <AvatarFallback className="bg-[var(--gr-violet)]/15 text-xs text-[var(--gr-violet-hi)]">{initial}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h3 className="font-display text-[15px] font-bold uppercase tracking-tight text-[var(--gr-text)] group-hover:text-[var(--gr-violet-hi)]">
                                      {name}
                                    </h3>
                                    <RoleBadge defaultRole={(host?.role ?? undefined) as UserRole | undefined} />
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    {room.map && <Pill tone="neutral" icon={<MapPin className="h-3 w-3" />}>{room.map}</Pill>}
                                    <Pill tone="neutral">{room.perspective}</Pill>
                                    {room.mode === "tdm" && <Pill tone="magenta">TDM</Pill>}
                                  </div>
                                </div>
                              </div>
                              <Pill tone="accent" icon={<UsersIcon className="h-3 w-3" />}>
                                {room.current_players}/{room.max_players}
                              </Pill>
                            </div>
                          </div>
                        </article>
                      </Link>
                    );
                  })}
                </div>
              )}
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
