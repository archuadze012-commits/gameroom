import Link from "next/link";
import { MessageCircle, Search, MessageSquare, Bell, Gamepad2, ShoppingBag, Users, Trophy, Flame, Zap, Building2, ArrowRight } from "lucide-react";
import { mockGames, crackedGames } from "@/lib/mock-data";
import { HomeNotificationsWidget } from "@/components/home-notifications-widget";
import { HomeSearchWidget } from "@/components/home-search-widget";
import { getIsAdmin, getSession } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { HomeHeroCarousel } from "@/components/home/home-hero-carousel";
import { HomeGuestHero } from "@/components/home/home-guest-hero";
import { getLiveStreams, type LiveStream } from "@/lib/streams/youtube-live";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPublishedArticles } from "@/lib/articles-db";
import { ArticleCard } from "@/components/article-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { DisplayHeading } from "@/components/ui/display-heading";
import { getSiteContentValue } from "@/lib/site-content";
import { Separator } from "@/components/ui/separator";
import { PostReactions } from "@/app/feed/[id]/post-reactions";
import { EditableText } from "@/components/admin/editable-text";
import { EditableImage } from "@/components/admin/editable-image";
import { PostComposer } from "@/components/post-composer";
import { PostOwnerActions } from "@/components/post-owner-actions";
import { PostContent } from "@/components/post-content";
export const dynamic = "force-dynamic";

type HomePost = {
  id: string;
  author_id: string;
  content: string;
  media_urls: string[] | null;
  likes_count: number;
  created_at: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

const QUICK_NAV = [
  { icon: Search,        label: "ძებნა",     href: "/search" },
  { icon: Gamepad2,      label: "თამაშები",  href: "/games" },
  { icon: MessageSquare, label: "მესენჯერი", href: "/messages" },
  { icon: Bell,          label: "უწყებები",  href: "/announcements" },
  { icon: ShoppingBag,   label: "შოპი",      href: "/shop" },
];

export default async function HomePage() {
  const [user, isAdmin] = await Promise.all([
    getSession().catch(() => null),
    getIsAdmin().catch(() => false),
  ]);
  const guestHero = await getSiteContentValue("home.guest.hero", {
    headline: "ყველაფერი, რის გამოც თამაშები გიყვარს",
    logoUrl: "/playgame-logo.png",
  });
  const userCta = await getSiteContentValue("home.user.cta", {
    heading: "იპოვე გუნდი ან მოწინააღმდეგე წამებში",
    description: "შექმენი ან იპოვე გუნდი და ითამაშე შენი საყვარელი თამაშები ქართველებთან ერთად",
    buttonLabel: "დაწყება",
    buttonHref: "/lfg",
  });
  const sectionGames = await getSiteContentValue("home.section.games", {
    title: "თამაშები",
  });
  const sectionFreeGames = await getSiteContentValue("home.section.free_games", {
    title: "PC თამაშები უფასოდ",
  });

  type ArticleItem = { kind: "article"; slug: string; title: string; excerpt: string | null; cover_url: string | null; game_name: string | null; author_username: string; published_at: string; date: number };
  type PostItem = { kind: "post"; post: HomePost; date: number };
  type FeedItem = ArticleItem | PostItem;

  let feedItems: FeedItem[] = [];
  let composerUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null = null;
  let liveStreams: LiveStream[] = [];
  let freePcGamesDb: any[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const profilePromise = user
      ? supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null });
    const [postsRes, articleRows, profileRes, streamsRes, crackedRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, author_id, content, media_urls, likes_count, created_at, profiles!posts_author_id_profiles_id_fk(username, display_name, avatar_url)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
      listPublishedArticles(4).catch(() => []),
      profilePromise,
      getLiveStreams(6),
      supabase.from("cracked_games").select("id, title, cover_url, rating").order("created_at", { ascending: false }).limit(3),
    ]);
    liveStreams = streamsRes;
    freePcGamesDb = crackedRes.data ?? [];
    const posts = (postsRes.data ?? []) as unknown as HomePost[];
    const postItems: PostItem[] = posts.map((p) => ({ kind: "post", post: p, date: new Date(p.created_at).getTime() }));
    const articleItems: ArticleItem[] = articleRows.map((r) => ({
      kind: "article",
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      cover_url: r.cover_url,
      game_name: r.game_name,
      author_username: r.author_username ?? "anonymous",
      published_at: r.published_at,
      date: new Date(r.published_at).getTime(),
    }));
    feedItems = [...postItems, ...articleItems].sort((a, b) => b.date - a.date);
    if (user) {
      const profile = profileRes.data;
      composerUser = {
        id: user.id,
        username: profile?.username ?? user.email?.split("@")[0] ?? "player",
        displayName:
          profile?.display_name ??
          String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? profile?.username ?? ""),
        avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      };
    }
  } catch (e) {
    console.error("[HomePage] Exception during fetch:", e);
  }

  const homeFreeGames = freePcGamesDb.length > 0
    ? freePcGamesDb.map((g) => ({
        id: String(g.id),
        title: String(g.title ?? ""),
        coverUrl: g.cover_url as string | null | undefined,
        rating: typeof g.rating === "number" ? g.rating : Number(g.rating ?? 0),
      }))
    : crackedGames.slice(0, 4).map((game) => ({
        id: game.id,
        title: game.title,
        coverUrl: game.coverUrl,
        rating: game.rating,
      }));

  // Non-admin guests get the interactive Goderdzi → Leo vanguard guide (full-screen).
  // Admins fall through to the editable hero below so site content stays editable.
  if (!user && !isAdmin) {
    return (
      <div className="relative mx-auto w-full min-h-[calc(100dvh-4rem)] -mt-16 pt-16 sm:mt-0 sm:pt-0 bg-transparent overflow-x-clip">
        {/* ── CINEMATIC BACKGROUND ────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 h-[1000px] w-full select-none pointer-events-none" style={{ maskImage: "linear-gradient(to bottom, black 0%, black 400px, transparent 800px)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 400px, transparent 800px)" }}>
          <div aria-hidden className="absolute inset-0 gr-dot-grid opacity-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_50%)] mix-blend-screen" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.1),transparent_50%)] mix-blend-screen" />
        </div>

        <div className="fixed inset-x-0 top-16 bottom-0 z-0 flex flex-col items-center justify-center overflow-hidden">
          <HomeGuestHero
            headline={String(guestHero.headline ?? "ყველაფერი, რის გამოც თამაშები გიყვარს")}
            logoUrl={String(guestHero.logoUrl ?? "/playgame-logo.png")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent overflow-x-clip">

      {/* ── CINEMATIC BACKGROUND ────────────────────────────── */}
      {!user ? (
        <div className="absolute top-0 left-0 right-0 h-[1000px] w-full select-none pointer-events-none" style={{ maskImage: "linear-gradient(to bottom, black 0%, black 400px, transparent 800px)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 400px, transparent 800px)" }}>
          <div aria-hidden className="absolute inset-0 gr-dot-grid opacity-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_50%)] mix-blend-screen" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.1),transparent_50%)] mix-blend-screen" />
        </div>
      ) : (
        <div className="absolute top-0 left-0 right-0 h-[1000px] w-full select-none pointer-events-none" style={{ maskImage: "linear-gradient(to bottom, black 0%, black 200px, transparent 500px)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 200px, transparent 500px)" }}>
          <div aria-hidden className="absolute inset-0 gr-dot-grid opacity-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.08),transparent_50%)] mix-blend-screen" />
        </div>
      )}

      <div className="container relative mx-auto px-4 pb-14 lg:pb-24 pt-10 lg:pt-16 space-y-16">
        
        {/* ── HEADER CONTENT ────────────────────────────── */}
        {!user ? (
          <section className="relative z-10 mx-auto max-w-5xl text-center flex flex-col items-center pt-8">
            <div className="mb-8 relative group">
              <EditableImage
                siteKey="home.guest.hero"
                field="logoUrl"
                value={String(guestHero.logoUrl ?? "/playgame-logo.png")}
                alt="Gameroom"
                imgClassName="relative z-10 h-44 w-44 object-contain transition-transform duration-700 group-hover:scale-105 lg:h-56 lg:w-56"
                folder="home"
                label="ლოგო"
              />
            </div>

            <DisplayHeading as="h1" size="display" className="leading-[1.1] bg-[linear-gradient(180deg,#fff_0%,rgba(255,255,255,0.65)_100%)] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">
              <EditableText
                siteKey="home.guest.hero"
                field="headline"
                value={String(guestHero.headline ?? "ყველაფერი, რის გამოც თამაშები გიყვარს")}
                multiline
                as="span"
                label="ჰედლაინი"
              />
            </DisplayHeading>

            <div className="mt-12 flex justify-center w-full max-w-[320px]">
              <GoogleSignInButton className="w-full" />
            </div>
          </section>
        ) : (
          <section className="relative z-10 mx-auto w-full flex flex-col items-center gap-10">
            {/* PRIMARY CTA CAROUSEL */}
            <HomeHeroCarousel
              cta={{
                description: String(userCta.description ?? "შექმენი ან იპოვე გუნდი და ითამაშე შენი საყვარელი თამაშები ქართველებთან ერთად"),
                buttonLabel: String(userCta.buttonLabel ?? "დაწყება"),
                buttonHref: String(userCta.buttonHref ?? "/lfg"),
              }}
              freeGamesTitle={String(sectionFreeGames.title ?? "PC თამაშები უფასოდ")}
              freeGames={freePcGamesDb.map((g) => ({ id: g.id, title: g.title, coverUrl: g.cover_url, rating: g.rating }))}
              liveStreams={
                liveStreams.length > 0
                  ? liveStreams
                  : [
                      {
                        id: "mock1",
                        username: "gameroom_ge",
                        displayName: "Gameroom Georgia",
                        avatarUrl: null,
                        videoId: "jfKfPfyJRdk",
                        title: "Lofi Girl - chill beats to game to",
                        thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg",
                        watchUrl: "https://youtube.com/watch?v=jfKfPfyJRdk",
                        viewers: 14500,
                        gameSlug: "chill",
                      },
                    ]
              }
            />

            {/* QUICK NAV */}
            <div className="hidden md:grid w-full max-w-4xl grid-cols-2 md:grid-cols-5 gap-4">
              {QUICK_NAV.map(({ icon: Icon, label, href }) => (
                <Link key={href} href={href} className="pubg-loadout-link group block" data-variant="strike">
                  <article className="pubg-loadout-card relative flex flex-col items-center gap-3 p-5 text-center">
                    <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                    <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px]" />
                    <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-8 w-8 opacity-20" />
                    
                    <div className="relative z-[1] flex flex-col items-center gap-3">
                      <Icon className="h-8 w-8 text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.45)] transition-all duration-500 group-hover:text-white group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_rgba(0,230,255,0.9)]" />
                      <span className="font-display text-[11px] font-black uppercase tracking-[0.15em] text-[#D0F8FF] transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(0,230,255,0.5)]">
                        {label}
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            <Link href="/playmanager" className="hidden md:block w-full max-w-4xl group">
              <article className="relative overflow-hidden rounded-[28px] border border-[#2b6b55] bg-[linear-gradient(135deg,rgba(3,18,13,0.96),rgba(6,33,24,0.94)_55%,rgba(9,52,38,0.92))] px-6 py-5 shadow-[0_0_0_1px_rgba(41,117,84,0.25),0_24px_60px_rgba(0,0,0,0.38)] transition-all duration-500 hover:-translate-y-1 hover:border-[#4fb488] hover:shadow-[0_0_0_1px_rgba(79,180,136,0.35),0_28px_70px_rgba(4,18,12,0.52)]">
                <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(48,145,102,0.26),transparent_38%),radial-gradient(circle_at_right,rgba(95,201,152,0.18),transparent_34%)] opacity-90" />
                <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(126,255,195,0.55),transparent)]" />
                <span className="relative z-[1] flex items-center justify-between gap-4">
                  <span className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#4fb488]/35 bg-[#143a2b]/80 text-[#d9ffec] transition-all duration-500 group-hover:scale-110 group-hover:border-[#7effc3]/55 group-hover:text-white group-hover:shadow-[0_0_18px_rgba(126,255,195,0.22)]">
                      <Building2 className="h-6 w-6" />
                    </span>
                    <span className="flex flex-col items-start text-left">
                      <span className="font-display text-[11px] font-black uppercase tracking-[0.22em] text-[#9edbbd]">
                        Manager Mode
                      </span>
                      <span className="font-display text-[26px] font-black uppercase tracking-[0.08em] text-white transition-all duration-300 group-hover:text-[#d9ffec]">
                        PlayManager
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 font-display text-[12px] font-black uppercase tracking-[0.16em] text-[#c7f6df] transition-all duration-300 group-hover:text-white">
                    შესვლა
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </span>
              </article>
            </Link>
          </section>
        )}

        {/* ── CINEMATIC GAMES SHOWCASE ────────────────────────────── */}
        {!user && (
          <section className="grid gap-8 lg:grid-cols-2 relative z-10">
            {/* Left: Games */}
            <div className="space-y-6">
              <div className="flex items-end justify-between px-2 border-b border-white/[0.07] pb-3">
                <DisplayHeading as="h2" size="md" className="text-[var(--gr-text)] drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]">
                  <EditableText siteKey="home.section.games" field="title" value={String(sectionGames.title ?? "თამაშები")} as="span" label="სექციის ტიტული" />
                </DisplayHeading>
                <Link href="/auth/login?next=%2Fgames" className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--gr-violet-hi)] transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]">
                  ყველა
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {mockGames.slice(0, 4).map((game) => (
                  <Link key={game.slug} href={`/games/${game.slug}`} className="pubg-loadout-link group block" data-variant="room">
                    <article className="pubg-loadout-card relative h-28 overflow-hidden !p-0">
                      <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                      <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
                      
                      {game.coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={game.coverUrl} alt={game.nameKa} className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity transition-all duration-700 group-hover:opacity-100 group-hover:scale-105 group-hover:mix-blend-normal z-[1]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-1)]/40 to-transparent z-[2]" />
                      <div className="relative z-[3] flex h-full items-end p-4">
                        <h4 className="font-display text-[14px] font-bold uppercase tracking-wide text-[var(--gr-text)] drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-all duration-300 group-hover:text-[var(--gr-cyan-glow)] group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]">{game.nameKa}</h4>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: Free PC Games */}
            <div className="space-y-6">
              <div className="flex items-end justify-between px-2 border-b border-white/[0.07] pb-3">
                <DisplayHeading as="h2" size="md" className="text-[var(--gr-text)] drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]">
                  <EditableText siteKey="home.section.free_games" field="title" value={String(sectionFreeGames.title ?? "PC თამაშები უფასოდ")} as="span" label="სექციის ტიტული" />
                </DisplayHeading>
                <Link href="/auth/login?next=%2Ffree-pc-games" className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--gr-magenta)] transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]">
                  ყველა
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {homeFreeGames.slice(0, 4).map((game) => (
                  <Link key={game.id} href={`/free-pc-games/${game.id}`} className="pubg-loadout-link group block" data-variant="strike">
                    <article className="pubg-loadout-card relative h-28 overflow-hidden !p-0">
                      <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                      <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
                      
                      {game.coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={game.coverUrl} alt={game.title} className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity transition-all duration-700 group-hover:opacity-100 group-hover:scale-105 group-hover:mix-blend-normal z-[1]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-1)]/40 to-transparent z-[2]" />
                      <div className="relative z-[3] flex h-full items-end justify-between p-4">
                        <h4 className="font-display text-[14px] font-bold uppercase tracking-wide text-[var(--gr-text)] drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-all duration-300 group-hover:text-[var(--gr-magenta)] group-hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]">{game.title}</h4>
                        <span className="text-[10px] font-black text-[var(--gr-amber)] bg-[var(--gr-amber)]/10 px-2 py-0.5 rounded-full border border-[var(--gr-amber)]/20 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">{game.rating}</span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CINEMATIC POSTS FEED ────────────────────────────── */}
        {user && (
          <section className="grid gap-8 lg:grid-cols-12 relative z-10">
            <div className="lg:col-span-8 space-y-6">
              {composerUser && (
                <PostComposer currentUser={composerUser} revalidatePath="/" />
              )}
              {feedItems.length === 0 ? (
                <div className="pubg-loadout-link group relative block transition-all duration-500" data-variant="strike">
                  <div className="pubg-loadout-card relative overflow-hidden p-16 text-center flex flex-col items-center">
                    <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                    <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
                    <div className="relative z-[1] flex flex-col items-center">
                      <Flame className="mb-4 h-10 w-10 text-[var(--gr-magenta)] drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
                      <p className="text-[14px] text-[var(--gr-text-mute)] font-medium">ჯერ არცერთი პოსტი არ არის. გახდი პირველი ვინც დაწერს!</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pubg-card-stage">
                  {feedItems.map((item, index) => {
                    if (item.kind === "article") {
                      return (
                        <div key={`article-${item.slug}`} style={{ "--pubg-card-index": index } as React.CSSProperties}>
                          <ArticleCard a={{ ...item, game_slug: null }} />
                        </div>
                      );
                    }
                    const p = item.post;
                    const author = p.profiles;
                    const name = author?.display_name ?? author?.username ?? "მომხმარებელი";
                    const initial = name.slice(0, 1).toUpperCase();
                    const created = (() => {
                      try {
                        return formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ka });
                      } catch {
                        return "";
                      }
                    })();
                    return (
                      <div key={p.id} className="pubg-loadout-link group block" data-variant="strike">
                        <Link href={`/profile/${author?.username ?? "user"}/${p.id}`} className="absolute inset-0 z-0" aria-label="პოსტის გახსნა" />
                        
                        <div className="pubg-loadout-card relative overflow-hidden p-5 sm:p-6">
                          <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                          <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
                          <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />
                          <div className="relative z-[1] flex flex-col">
                            {/* Author Header */}
                            <div className="flex items-start gap-4">
                              <Link href={author?.username ? `/profile/${author.username}` : "#"} className="relative z-10 shrink-0">
                                <Avatar className="h-10 w-10 border border-white/10 shadow-[0_0_18px_rgba(0,230,255,0.12)] transition-colors group-hover:border-pink-500/50">
                                  <AvatarImage src={author?.avatar_url ?? undefined} alt={name} className="object-cover" />
                                  <AvatarFallback className="bg-[linear-gradient(135deg,var(--gr-magenta),var(--gr-cyan-glow))] text-[14px] font-black text-white">
                                    {initial}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="min-w-0 flex-1 pt-0.5">
                                <div className="flex flex-col">
                                  <Link href={author?.username ? `/profile/${author.username}` : "#"} className="relative z-10 font-display text-[15px] font-black uppercase tracking-[0.04em] text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.45)] transition-colors hover:text-white">
                                    {name}
                                  </Link>
                                  {created && (
                                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#D0F8FF]/72">
                                      {created}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="relative z-10 mt-4 pointer-events-none">
                              <PostContent content={p.content} mediaUrls={p.media_urls} />
                            </div>

                            {/* Reactions */}
                            <div className="relative z-10 mt-4">
                              <PostReactions postId={p.id} hideHeading />
                            </div>

                            <Separator className="my-4 bg-white/10" />

                            {/* Comments Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3 relative z-10">
                              <Link
                                href={`/profile/${author?.username ?? "user"}/${p.id}#comments`}
                                className="group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-white/80"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                კომენტარები
                              </Link>
                              {user && author?.username ? (
                                <PostOwnerActions
                                  postId={p.id}
                                  canEdit={p.author_id === user.id}
                                  canDelete={p.author_id === user.id || isAdmin}
                                  editHref={p.author_id === user.id ? `/profile/${author.username}/${p.id}/edit` : undefined}
                                />
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Sidebar Column */}
            <div className="lg:col-span-4 space-y-6">
              <div className="pubg-loadout-link group relative block" data-variant="room">
                <div className="pubg-loadout-card relative overflow-hidden p-6">
                  <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                  <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
                  <div className="relative z-[1]">
                    <h3 className="font-display text-[12px] font-black uppercase tracking-[0.2em] mb-5 text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.6)]">
                      უწყებები
                    </h3>
                    <HomeNotificationsWidget />
                  </div>
                </div>
              </div>

              <div className="pubg-loadout-link group relative block" data-variant="strike">
                <div className="pubg-loadout-card relative overflow-hidden p-6">
                  <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                  <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
                  <div className="relative z-[1]">
                    <h3 className="font-display text-[12px] font-black uppercase tracking-[0.2em] mb-5 text-[#D0F8FF] drop-shadow-[0_0_8px_rgba(0,230,255,0.6)]">
                      მოთამაშეების ძებნა
                    </h3>
                    <HomeSearchWidget />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
