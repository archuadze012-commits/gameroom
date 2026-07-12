import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  MessageSquare,
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
  Gift,
  Headphones,
} from "lucide-react";
import type { MockGame } from "@/lib/mock-data";
import { FindMatchButton } from "@/components/find-match-button";
import { FavoriteGameButton } from "@/components/favorite-game-button";
import { FavoritesProvider } from "@/lib/favorites-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";
import { getSiteUrl } from "@/lib/url";


const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const LOBBY_GAMES = new Set<string>(["pubg-mobile"]);

type GameLfgPreview = {
  id: string;
  authorName: string;
  title: string;
  rank: string;
  region: string;
  voiceRequired: boolean;
  createdAgo: string;
};

type GameTournamentPreview = {
  slug: string;
};

function createdAgo(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (elapsedMinutes < 60) return `${elapsedMinutes} წთ წინ`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} სთ წინ`;
  return `${Math.floor(elapsedHours / 24)} დღე წინ`;
}

function pubgCardDelay(index: number) {
  return { "--pubg-card-index": index } as React.CSSProperties;
}

const getGameLabels = (slug: string) => {
  if (slug === "cs2") {
    return {
      classicTitle: "პრემიერ რეჟიმი",
      classicLabel: "PREMIER",
      royaleTitle: "კომპეტიტივი",
      royaleLabel: "COMPETITIVE",
      duelTitle: "WINGMAN (2 VS 2)",
      duelLabel: "WINGMAN",
      roomTitle: "FACEIT ლოკალები",
      roomLabel: "FACEIT",
      drillTitle: "დესმაჩი / რითეიქები",
      drillLabel: "WARMUP",
      dropTitle: "გათამაშებები",
      dropLabel: "DROP",
      bracketTitle: "ტურნირები",
      bracketLabel: "BRACKET",
      rankTitle: "FACEIT ELO",
      rankLabel: "RANK",
    };
  } else if (slug === "eafc26" || slug === "eafc25" || slug === "eafc24" || slug === "fifa") {
    return {
      classicTitle: "ULTIMATE TEAM",
      classicLabel: "FUT",
      royaleTitle: "FUT CHAMPIONS",
      royaleLabel: "CHAMPS",
      duelTitle: "1 VS 1 მატჩი",
      duelLabel: "KICK OFF",
      roomTitle: "PRO CLUBS",
      roomLabel: "CLUBS",
      drillTitle: "CO-OP SEASONS",
      drillLabel: "CO-OP",
      dropTitle: "გათამაშებები",
      dropLabel: "DROP",
      bracketTitle: "ტურნირები",
      bracketLabel: "CUP",
      rankTitle: "DIVISION RIVALS",
      rankLabel: "RIVALS",
    };
  }
  return {
    classicTitle: "კლასიკები",
    classicLabel: "CLASSIC",
    royaleTitle: "ULTIMATE ROYALE",
    royaleLabel: "ROYAL",
    duelTitle: "1 VS 1",
    duelLabel: "DUEL",
    roomTitle: "ROOM სტრიმები",
    roomLabel: "ROOM",
    drillTitle: "პრაქტიკული თამაშები",
    drillLabel: "DRILL",
    dropTitle: "გათამაშებები",
    dropLabel: "DROP",
    bracketTitle: "ახალი ბრაკეტი",
    bracketLabel: "BRACKET",
    rankTitle: "რეიტინგი",
    rankLabel: "RANK",
  };
};

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
  neon?: boolean;
  index?: number;
  label?: string;
  className?: string;
  variant?: "strike" | "royale" | "room" | "support";
};

type PubgCommandCardProps = {
  href: string;
  title: string;
  icon: React.ReactNode;
  label: string;
  className?: string;
  titleClassName?: string;
  iconSizeClassName?: string;
  index?: number;
  variant?: "strike" | "royale" | "room" | "support";
};

function PubgCommandCard({
  href,
  title,
  icon,
  label,
  className = "",
  titleClassName = "text-[22px] sm:text-[26px]",
  iconSizeClassName = "[&_svg]:h-10 [&_svg]:w-10 sm:[&_svg]:h-12 sm:[&_svg]:w-12",
  index = 0,
  variant = "strike",
}: PubgCommandCardProps) {
  return (
    <Link
      href={href}
      className={`pubg-loadout-link group block h-full ${className}`}
      data-variant={variant}
      style={pubgCardDelay(index)}
    >
      <article className="pubg-loadout-card relative h-full min-h-[146px] overflow-hidden px-4 py-4 sm:min-h-[160px] sm:px-5">
        <span aria-hidden className="pubg-loadout-field absolute inset-0" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-16 w-16" />
        <span aria-hidden className="pubg-loadout-sweep absolute inset-y-0 left-0 w-1/3" />

        <div className="relative z-[1] flex h-full min-h-[118px] flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] pb-3">
            <div className="min-w-0">
              <p className="pubg-loadout-kicker text-[10px] font-black uppercase leading-none tracking-[0.24em] text-white/58">
                {label}
              </p>
              <span aria-hidden className="pubg-loadout-marker mt-2 block h-px w-16" />
            </div>
            <span className="pubg-loadout-code font-display text-[13px] font-black uppercase tracking-[0.18em] text-white/34">
              #{String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <div className="relative grid grid-cols-[1fr_auto] items-end gap-4">
            <h3
              className={`pubg-loadout-title line-clamp-2 max-w-[17rem] font-display font-black uppercase leading-[0.94] text-white ${titleClassName}`}
              title={title}
            >
              {title}
            </h3>
            <span className={`pubg-loadout-icon grid h-14 w-14 place-items-center text-white ${iconSizeClassName}`}>
              {icon}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function PromoCard({ href, title, icon, accent, neon = false, index = 0, label = "MODE", className = "", variant = "strike" }: PromoCardProps) {
  if (neon) {
    return (
      <PubgCommandCard
        href={href}
        title={title}
        icon={icon}
        label={label}
        className={className}
        titleClassName="text-[22px] sm:text-[25px]"
        iconSizeClassName="[&_svg]:h-8 [&_svg]:w-8 sm:[&_svg]:h-10 sm:[&_svg]:w-10"
        index={index}
        variant={variant}
      />
    );
  }

  return (
    <Link href={href} className="group relative block">
      <div className="absolute -inset-[2px] bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
      <article
        className="relative isolate transition-transform duration-300 group-hover:-translate-y-1"
      >
        <div
          className="relative h-56 overflow-hidden bg-[var(--gr-bg-1)]"
          style={{ clipPath: cutSm }}
        >
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: g } = await supabase
    .from("games")
    .select("name_ka, description, cover_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!g) return { title: "თამაში ვერ მოიძებნა", robots: { index: false } };
  const name = g.name_ka;
  const description = g?.description || `${name} — ლობი, ჩემპიონატები, გუნდები და შოპი PLAYGAME.GE-ზე.`;
  const cover = g.cover_url;
  return {
    title: name,
    description,
    alternates: { canonical: `/games/${slug}` },
    openGraph: { title: name, description, url: `/games/${slug}`, type: "website", images: cover ? [{ url: cover }] : undefined },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const fiveMinutesAgoDate = new Date();
  fiveMinutesAgoDate.setMinutes(fiveMinutesAgoDate.getMinutes() - 5);
  const fiveMinutesAgo = fiveMinutesAgoDate.toISOString();
  const nowIso = new Date().toISOString();
  const [
    { data: dbGame, error: gameError },
    { data: roomsRaw },
    { data: lfgRaw },
    { count: liveLfgCount },
    { data: tournamentsRaw },
    { count: playerCount },
    { count: onlineCount },
  ] = await Promise.all([
    supabase.from("games").select("*").eq("slug", slug).maybeSingle(),
    supabase
      .from("game_rooms")
      .select("id, room_code, mode, map, perspective, max_players, current_players, host_id")
      .eq("game_slug", slug)
      .eq("status", "open")
      .gt("expires_at", nowIso)
      .limit(30),
    supabase
      .from("lfg_posts")
      .select("id, title, rank, region, voice_required, created_at, profiles(username, display_name)")
      .eq("game_slug", slug)
      .eq("status", "open")
      .is("deleted_at", null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("lfg_posts")
      .select("id", { count: "exact", head: true })
      .eq("game_slug", slug)
      .eq("status", "open")
      .is("deleted_at", null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    supabase
      .from("tournaments")
      .select("slug, games:game_id!inner(slug)")
      .eq("games.slug", slug)
      .in("status", ["open", "checkin", "live"])
      .order("starts_at", { ascending: true })
      .limit(6),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("banned", false)
      .contains("favorite_game_slugs", [slug]),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("banned", false)
      .contains("favorite_game_slugs", [slug])
      .gt("last_seen_at", fiveMinutesAgo),
  ]);

  if (gameError) throw gameError;
  if (!dbGame) notFound();

  const gameLfg: GameLfgPreview[] = (lfgRaw ?? []).map((post) => {
    const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
    return {
      id: post.id,
      authorName: profile?.display_name || profile?.username || "მოთამაშე",
      title: post.title,
      rank: post.rank || "ნებისმიერი",
      region: post.region || "GE",
      voiceRequired: post.voice_required,
      createdAgo: createdAgo(post.created_at),
    };
  });
  const gameTournaments = (tournamentsRaw ?? []) as unknown as GameTournamentPreview[];

  const game: MockGame = {
        slug: dbGame.slug,
        nameKa: dbGame.name_ka,
        nameEn: dbGame.name_en,
        description: dbGame.description ?? "",
        accent: dbGame.accent_color ?? "",
        emoji: dbGame.emoji ?? "🎮",
        iconUrl: dbGame.icon_url ?? undefined,
        coverUrl: dbGame.cover_url ?? undefined,
        players: playerCount ?? 0,
        online: onlineCount ?? 0,
        liveLfg: liveLfgCount ?? 0,
        favoritedBy: playerCount ?? 0,
      };

  const hasLobby = LOBBY_GAMES.has(game.slug);
  const hasPubgCommandCards = true;
  const labels = getGameLabels(game.slug);
  const hidesLfgPreview = game.slug === "pubg-mobile";

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

  const gameJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.nameEn || game.nameKa,
    alternateName: game.nameKa,
    description: game.description || undefined,
    image: game.coverUrl || undefined,
    url: `${getSiteUrl()}/games/${game.slug}`,
    genre: "Video Game",
    gamePlatform: "Online",
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameJsonLd) }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      {game.coverUrl && (
        <div className="relative h-56 overflow-hidden border-b border-white/5 sm:h-72 lg:h-80 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-[var(--gr-violet-hi)] after:to-transparent after:shadow-[0_0_20px_var(--gr-violet)]">
          <div className={`absolute inset-0 bg-gradient-to-br ${game.accent} opacity-30 mix-blend-overlay`} />
          <Image
            src={game.coverUrl}
            alt=""
            fill
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: "top center" }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(10,8,20,0) 0%, rgba(10,8,20,0.6) 70%, rgba(10,8,20,1) 100%)" }}
          />
        </div>
      )}

      <div className="container relative mx-auto px-4 py-8 lg:py-10">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {slug !== "pubg-mobile" && game.nameEn && game.nameEn !== game.nameKa ? (
              <Eyebrow tone="violet">{game.nameEn}</Eyebrow>
            ) : null}
            <DisplayHeading as="h1" size="display" className="mt-2 bg-[linear-gradient(180deg,#fff_0%,rgba(255,255,255,0.65)_100%)] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              {game.nameKa}
            </DisplayHeading>
            {slug !== "pubg-mobile" && game.description ? (
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--gr-text-mute)]">
                {game.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasLobby ? (
              <ChevronButton href={`/games/${game.slug}/lobby`} neon size="sm">
                <DoorOpen className="h-3.5 w-3.5" /> ლობის გახსნა
              </ChevronButton>
            ) : null}
            <FavoritesProvider>
              <FavoriteGameButton slug={game.slug} />
            </FavoritesProvider>
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

        <div className="space-y-10">
            <section>
              <div className="mb-5">
                <div>
                  <DisplayHeading as="h2" size="md" className="mt-2 max-w-xl sm:text-[18px] text-[var(--gr-text)] drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]">
                    იპოვე თიმმეითი ან ეთამაშე ერთი ერთზე
                  </DisplayHeading>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <FindMatchButton gameSlug={game.slug} gameName={game.nameKa} />
                  <ChevronButton href={`/lfg/new?game=${game.slug}`} neon size="sm">
                    <Plus className="h-3.5 w-3.5" /> ახალი ლოკალი
                  </ChevronButton>
                </div>
              </div>
              {!hidesLfgPreview ? (
                <div className={`space-y-3 ${hasPubgCommandCards ? "pubg-card-stage" : ""}`}>
                  {gameLfg.length === 0 && hasPubgCommandCards ? (
                    <PubgCommandCard
                      href={`/lfg/new?game=${game.slug}`}
                      title="პირველი ლოკალი"
                      label="OPEN SQUAD"
                      icon={<UsersIcon />}
                      index={0}
                      variant="support"
                      className="max-w-2xl"
                      titleClassName="text-[26px] sm:text-[34px]"
                    />
                  ) : gameLfg.length === 0 ? (
                    <EmptyState
                      tone="violet"
                      illustration={<UsersIcon className="h-8 w-8 text-[var(--gr-violet-hi)]" />}
                      title="ჯერ ლოკალი არ არის"
                      description="გახდი პირველი ვინც დაიწყებს ძებნას ამ თამაშზე."
                      action={
                        <ChevronButton href={`/lfg/new?game=${game.slug}`} neon size="md">
                          <Plus className="h-4 w-4" /> ახალი ლოკალი
                        </ChevronButton>
                      }
                    />
                  ) : hasPubgCommandCards ? (
                    gameLfg.map((post, index) => (
                      <PubgCommandCard
                        key={post.id}
                        href={`/lfg/${post.id}`}
                        title={post.title}
                        label={`${post.rank} / ${post.region}`}
                        icon={post.voiceRequired ? <Mic /> : <UsersIcon />}
                        index={index}
                        variant="support"
                        className="max-w-2xl"
                        titleClassName="text-[22px] sm:text-[28px]"
                      />
                    ))
                  ) : (
                    gameLfg.map((post) => (
                      <Link
                        key={post.id}
                        href={`/lfg/${post.id}`}
                        className="group relative block"
                      >
                        <div className="absolute -inset-[2px] bg-gradient-to-r from-pink-500 to-violet-500 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-500" />
                        <article
                          className="relative isolate transition-transform duration-300 group-hover:-translate-y-0.5"
                        >
                          <div
                            className="relative bg-[var(--gr-bg-1)] p-4 gr-sweep"
                            style={{ clipPath: cutSm }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="font-display text-[15px] font-bold uppercase tracking-tight text-[var(--gr-text)] group-hover:text-[var(--gr-violet-hi)]">
                                  {post.title}
                                </h3>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">
                                  {post.authorName} · {post.createdAgo}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <Pill tone="amber">{post.rank}</Pill>
                                  {post.voiceRequired ? (
                                    <Pill tone="violet" icon={<Mic className="h-3 w-3" />}>Mic</Pill>
                                  ) : null}
                                  <Pill tone="cyan" icon={<MapPin className="h-3 w-3" />}>{post.region}</Pill>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      </Link>
                    ))
                  )}
                </div>
              ) : null}
            </section>

            <section>
              {game.slug === "pubg-mobile" && (
                <div className="mb-4">
                  {hasPubgCommandCards ? (
                    <PubgCommandCard
                      href="/pubg-mobile/chat"
                      title="PUBG Mobile-ის ჩატი"
                      label="LIVE CHAT"
                      icon={<MessageSquare />}
                      className="min-h-[156px]"
                      titleClassName="text-[28px] sm:text-[38px]"
                      iconSizeClassName="[&_svg]:h-10 [&_svg]:w-10 sm:[&_svg]:h-12 sm:[&_svg]:w-12"
                      index={0}
                      variant="support"
                    />
                  ) : (
                    <Link
                      href="/pubg-mobile/chat"
                      className="group relative flex items-center justify-between gap-4 overflow-hidden bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(14,165,233,0.18))] px-5 py-4 text-white ring-1 ring-[var(--gr-violet-hi)]/45 shadow-[0_10px_30px_-12px_rgba(124,58,237,0.76)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:ring-[var(--gr-amber)]/55 hover:shadow-[0_0_28px_rgba(14,165,233,0.28)] sm:px-6"
                      style={{ clipPath: cutSm }}
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.18)_35%,transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                      <div className="relative z-[1] min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-violet-hi)]/85">
                          PUBG MOBILE CHAT
                        </p>
                        <h3 className="mt-1 font-display text-[22px] font-extrabold uppercase leading-[1.02] tracking-tight text-[var(--gr-text)] sm:text-[26px]">
                          PUBG Mobile-ის ჩატი
                        </h3>
                      </div>
                      <div className="relative z-[1] rounded-full border border-white/12 bg-white/[0.04] p-4 shadow-[0_0_30px_rgba(139,92,246,0.24)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                        <MessageSquare className="h-8 w-8 text-white/95 drop-shadow-[0_0_18px_rgba(34,211,238,0.4)]" />
                      </div>
                    </Link>
                  )}
                </div>
              )}

              <div className={`mb-6 grid gap-4 sm:grid-cols-2 ${hasPubgCommandCards ? "pubg-card-stage" : ""}`}>
                {hasPubgCommandCards ? (
                  <>
                    <PubgCommandCard
                      href={`/clans?game=${game.slug}`}
                      title="კლანის გვერდი"
                      label="CLAN HUB"
                      icon={<Shield />}
                      className="min-h-[176px]"
                      titleClassName="text-[28px] sm:text-[36px]"
                      iconSizeClassName="[&_svg]:h-10 [&_svg]:w-10 sm:[&_svg]:h-12 sm:[&_svg]:w-12"
                      index={1}
                      variant="strike"
                    />
                    <PubgCommandCard
                      href={`/games/${game.slug}/discordvoicechannels`}
                      title="ხმოვანი ოთახები"
                      label="VOICE COMMS"
                      icon={<Headphones />}
                      className="min-h-[176px]"
                      titleClassName="text-[28px] sm:text-[36px]"
                      iconSizeClassName="[&_svg]:h-10 [&_svg]:w-10 sm:[&_svg]:h-12 sm:[&_svg]:w-12"
                      index={2}
                      variant="room"
                    />
                  </>
                ) : (
                  <>
                    <Link href={`/clans?game=${game.slug}`} className="group relative block">
                      <div className="absolute -inset-[2px] bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
                      <article
                        className="relative isolate h-full transition-transform duration-300 group-hover:-translate-y-1"
                      >
                        <div
                          className="relative h-full overflow-hidden bg-[var(--gr-bg-1)] px-5 py-5 sm:px-6"
                          style={{ clipPath: cutSm }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/18 via-transparent to-cyan-500/14" />
                          <div className="absolute inset-y-0 right-0 w-28 bg-[linear-gradient(180deg,rgba(34,211,238,0.5),rgba(139,92,246,0.12))] [clip-path:polygon(28%_0,100%_0,100%_100%,0_100%)]" />
                          <div className="relative z-[1] flex h-full items-center justify-between gap-4">
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

                    <Link href={`/games/${game.slug}/discordvoicechannels`} className="group relative block">
                      <div className="absolute -inset-[2px] bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500" />
                      <article
                        className="relative isolate h-full transition-transform duration-300 group-hover:-translate-y-1"
                      >
                        <div
                          className="relative h-full overflow-hidden bg-[var(--gr-bg-1)] px-5 py-5 sm:px-6"
                          style={{ clipPath: cutSm }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/18 via-transparent to-cyan-500/14" />
                          <div className="absolute inset-y-0 right-0 w-28 bg-[linear-gradient(180deg,rgba(34,211,238,0.5),rgba(139,92,246,0.12))] [clip-path:polygon(28%_0,100%_0,100%_100%,0_100%)]" />
                          <div className="relative z-[1] flex h-full items-center justify-between gap-4">
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
                  </>
                )}
              </div>

              <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${hasPubgCommandCards ? "pubg-card-stage" : ""}`}>
                <PromoCard
                  href="/lfg?mode=classic"
                  title={labels.classicTitle}
                  icon={<Crosshair />}
                  accent="from-violet-500/25 to-sky-500/10"
                  neon={hasPubgCommandCards}
                  index={3}
                  label={labels.classicLabel}
                  variant="strike"
                  className="lg:col-span-2"
                />
                <PromoCard
                  href="/lfg?mode=ultimate-royale"
                  title={labels.royaleTitle}
                  icon={<Flame />}
                  accent="from-orange-500/20 to-amber-500/10"
                  neon={hasPubgCommandCards}
                  index={4}
                  label={labels.royaleLabel}
                  variant="royale"
                />
                <PromoCard
                  href="/lfg?mode=1v1"
                  title={labels.duelTitle}
                  icon={<Swords />}
                  accent="from-amber-500/20 to-violet-500/10"
                  neon={hasPubgCommandCards}
                  index={5}
                  label={labels.duelLabel}
                  variant="strike"
                />
                <PromoCard
                  href={featuredRoom ? `/rooms/${featuredRoom.room_code}` : `/rooms/new?game=${game.slug}`}
                  title={featuredRoom ? `ROOM ${featuredRoom.mode.toUpperCase()}` : labels.roomTitle}
                  icon={<DoorOpen />}
                  accent="from-violet-500/25 to-cyan-500/10"
                  neon={hasPubgCommandCards}
                  index={6}
                  label={labels.roomLabel}
                  variant="room"
                />
                <PromoCard
                  href="/lfg?mode=practice"
                  title={labels.drillTitle}
                  icon={<Target />}
                  accent="from-emerald-500/25 to-cyan-500/10"
                  neon={hasPubgCommandCards}
                  index={7}
                  label={labels.drillLabel}
                  variant="support"
                />
                <PromoCard
                  href="/free-pc-games"
                  title={labels.dropTitle}
                  icon={<Gift />}
                  accent="from-cyan-500/25 to-orange-500/10"
                  neon={hasPubgCommandCards}
                  index={8}
                  label={labels.dropLabel}
                  variant="royale"
                />
                <PromoCard
                  href="/tournaments"
                  title={featuredTournament ? "ტურნირები" : labels.bracketTitle}
                  icon={<Trophy />}
                  accent="from-amber-500/25 to-orange-500/10"
                  neon={hasPubgCommandCards}
                  index={9}
                  label={labels.bracketLabel}
                  variant="royale"
                  className="lg:col-span-2"
                />
                <PromoCard
                  href="/leaderboard"
                  title={labels.rankTitle}
                  icon={<Star />}
                  accent="from-sky-500/25 to-violet-500/10"
                  neon={hasPubgCommandCards}
                  index={10}
                  label={labels.rankLabel}
                  variant="support"
                />
              </div>
            </section>

        </div>
      </div>
    </div>
  );
}
