import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Search, MessageSquare, Bell, Gamepad2, ShoppingBag, Flame, ArrowRight } from "lucide-react";
import { mockGames, crackedGames } from "@/lib/mock-data";
import { HomeNotificationsWidget } from "@/components/home-notifications-widget";
import { HomeSearchWidget } from "@/components/home-search-widget";
import { getSession, isAdminFromProfile } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
// Lazy wrappers: guest hero and authed carousel are code-split into separate
// chunks so each audience downloads only its own hero (see home-hero-lazy.tsx).
import { HomeHeroCarousel, HomeGuestHero } from "@/components/home/home-hero-lazy";
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
import { DeferMount } from "@/components/defer-mount";
import { PostComposer } from "@/components/post-composer";
import { OnboardingChecklist } from "@/components/home/onboarding-checklist";
import { HomeFeedSeed } from "@/components/home/home-feed-seed";
import { getFeedSeed, type FeedSeed } from "@/lib/home/feed-seed";
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
  const user = await getSession().catch(() => null);

  // Guests get the full-screen Goderdzi→Leo hero, which reads only the
  // guest-hero site content. Return before the authed data pipeline (posts,
  // articles, YouTube live API, cracked games) — none of it renders for
  // guests, so fetching it was pure server latency on the highest-traffic
  // public page. Admin status comes from the profiles row fetched below, so
  // the guest path costs a single auth round trip.
  if (!user) {
    const guestHero = await getSiteContentValue("home.guest.hero", {
      headline: "ყველაფერი, რის გამოც თამაშები გიყვარს",
      logoUrl: "/playgame-logo.png",
    });
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

  // ── Authed / admin home ──────────────────────────────
  // Site-content lookups are independent per-key Supabase reads — kick them
  // off here WITHOUT awaiting so they run concurrently with the posts/
  // articles/streams batch below instead of adding a serial round trip
  // before it. Awaited after the try block (always reached).
  const siteContentPromise = Promise.all([
    getSiteContentValue("home.guest.hero", {
      headline: "ყველაფერი, რის გამოც თამაშები გიყვარს",
      logoUrl: "/playgame-logo.png",
    }),
    getSiteContentValue("home.user.cta", {
      heading: "იპოვე გუნდი ან მოწინააღმდეგე წამებში",
      description: "შექმენი ან იპოვე გუნდი და ითამაშე შენი საყვარელი თამაშები ქართველებთან ერთად",
      buttonLabel: "დაწყება",
      buttonHref: "/lfg",
    }),
    getSiteContentValue("home.section.games", { title: "თამაშები" }),
    getSiteContentValue("home.section.free_games", { title: "PC თამაშები უფასოდ" }),
  ]);

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
  let isAdmin = false;
  // Seeded content for the empty-feed path (see getFeedSeed).
  let feedSeed: FeedSeed = { suggestedUsers: [], lfgPosts: [] };
  // First-run onboarding signals (see OnboardingChecklist). Default to "done" so
  // that if the fetch fails we never nag with a checklist we can't verify.
  let onboarding = {
    hasProfile: true,
    hasGames: true,
    hasFollows: true,
    hasPush: true,
    hasClaimedDaily: true,
  };
  type FreePcGameRow = { id: string; title: string; cover_url: string | null; rating: number };
  let freePcGamesDb: FreePcGameRow[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    // role/banned ride along so the admin check doesn't need its own
    // profiles round trip (previously a separate getIsAdmin() query).
    const profilePromise = supabase
      .from("profiles")
      .select("username, display_name, avatar_url, role, banned, favorite_game_slugs, bio, last_login_award_at")
      .eq("id", user.id)
      .maybeSingle();
    const [postsRes, articleRows, profileRes, streamsRes, crackedRes, followCountRes, pushCountRes] = await Promise.all([
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
      // Onboarding signals (head-only counts — no rows shipped).
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
      supabase.from("push_subscriptions").select("*", { count: "exact", head: true }).eq("user_id", user.id),
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
    // Empty room → seed the feed with players to follow + open LFG (only pays
    // the extra queries when there's nothing social to show).
    if (feedItems.length === 0) {
      feedSeed = await getFeedSeed(supabase, user.id);
    }
    const profile = profileRes.data;
    isAdmin = isAdminFromProfile(profile, user.email);
    onboarding = {
      // "complete profile" = avatar + a written bio (Google users start with an
      // avatar but no bio, so this keeps the step meaningful).
      hasProfile: !!profile?.avatar_url && !!profile?.bio?.trim(),
      hasGames: Array.isArray(profile?.favorite_game_slugs) && profile.favorite_game_slugs.length > 0,
      // Social-graph bootstrap — done once they follow at least 3 players.
      hasFollows: (followCountRes.count ?? 0) >= 3,
      hasPush: (pushCountRes.count ?? 0) > 0,
      hasClaimedDaily: !!profile?.last_login_award_at,
    };
    composerUser = {
      id: user.id,
      username: profile?.username ?? user.email?.split("@")[0] ?? "player",
      displayName:
        profile?.display_name ??
        String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? profile?.username ?? ""),
      avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
    };
  } catch (e) {
    console.error("[HomePage] Exception during fetch:", e);
  }

  // getSiteContentValue resolves to its defaults on failure, so this await
  // cannot throw; it has been running since before the batch above.
  const [guestHero, userCta, sectionGames, sectionFreeGames] = await siteContentPromise;

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={String(guestHero.logoUrl ?? "/playgame-logo.png")}
                alt="Gameroom"
                className="relative z-10 h-44 w-44 object-contain transition-transform duration-700 group-hover:scale-105 lg:h-56 lg:w-56"
              />
            </div>

            <DisplayHeading as="h1" size="display" className="leading-[1.1] bg-[linear-gradient(180deg,#fff_0%,rgba(255,255,255,0.65)_100%)] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">
              {String(guestHero.headline ?? "ყველაფერი, რის გამოც თამაშები გიყვარს")}
            </DisplayHeading>

            <div className="mt-12 flex justify-center w-full max-w-[320px]">
              <GoogleSignInButton className="w-full" />
            </div>
          </section>
        ) : (
          <section className="relative z-10 mx-auto w-full flex flex-col items-center gap-10">
            <div className="w-full max-w-2xl">
              <OnboardingChecklist
                hasProfile={onboarding.hasProfile}
                hasGames={onboarding.hasGames}
                hasFollows={onboarding.hasFollows}
                hasPush={onboarding.hasPush}
                hasClaimedDaily={onboarding.hasClaimedDaily}
                isAdmin={isAdmin}
              />
            </div>

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
                      <Icon className="h-8 w-8 text-white/70 transition-all duration-500 group-hover:text-[#D0F8FF] group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_rgba(0,230,255,0.9)]" />
                      <span className="font-display text-[11px] font-black uppercase tracking-[0.15em] text-white/70 transition-all duration-300 group-hover:text-[#D0F8FF] group-hover:drop-shadow-[0_0_8px_rgba(0,230,255,0.5)]">
                        {label}
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            <Link href="/playmanager" className="pubg-loadout-link hidden md:block w-full max-w-4xl group" data-variant="pm-green">
              <article className="pubg-loadout-card relative overflow-hidden px-6 py-5">
                <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]" />
                <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />
                <span className="relative z-[1] flex items-center justify-between gap-4">
                  <span className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/45 transition-all duration-500 group-hover:scale-110 group-hover:border-[#7effc3]/55 group-hover:bg-[#143a2b]/80 group-hover:text-white group-hover:shadow-[0_0_18px_rgba(126,255,195,0.35)]">
                      <svg id="_Слой_1" data-name="Слой 1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 760.12 829.78" className="playmanager-home-logo h-6 w-6">
                        <defs>
                          <style>{`
                            .playmanager-home-logo .cls-1 { fill: currentColor; }
                            .playmanager-home-logo .cls-2, .playmanager-home-logo .cls-3, .playmanager-home-logo .cls-4 { stroke-miterlimit: 10; }
                            .playmanager-home-logo .cls-2, .playmanager-home-logo .cls-4 { stroke: currentColor; }
                            .playmanager-home-logo .cls-2 { fill: currentColor; }
                            .playmanager-home-logo .cls-5 { clip-path: url(#clippath); }
                            .playmanager-home-logo .cls-3 { stroke: currentColor; stroke-width: 4px; }
                            .playmanager-home-logo .cls-3, .playmanager-home-logo .cls-4 { fill: none; }
                            .playmanager-home-logo .cls-4 { stroke-width: 9px; }
                            .playmanager-home-logo path:not([class]) { fill: currentColor; }
                            .playmanager-home-logo circle:not([class]) { fill: #0b0111; }
                          `}</style>
                          <clipPath id="clippath">
                            <circle className="cls-4" cx="533.34" cy="638.18" r="164.39"/>
                          </clipPath>
                        </defs>
                        <path className="cls-2" d="M.58,636.5s-4-152,46-200,126-53,126-53l90,220,18-154-35-66,44-20,39,24-32,59,32,161,76-219s89,11,130,44,50,186,50,186c0,0-97,87-292,83S.58,636.5,.58,636.5Z"/>
                        <path d="M162.52,65.15c-15.21,53.32-5.36,126.23,6.9,179.9,6.22,12.23,15.69,28.12,25.73,39.77,1.41,1.79,3.77,4.2,5.31,5.94,3.48,3.93,7.49,7.63,11.29,11.22,1.11,.98,6.62,5.53,7.61,6.4,1.05,.85,3.69,2.7,4.8,3.55,1.86,1.4,4.54,3.36,6.52,4.55,1.97,1.21,4.72,3.14,6.73,4.23,15.96,9.27,33.75,15.84,52.03,18.43,5.16,.66,10.31,1.22,15.51,.58,35.25-3.99,70.86-29.45,91.24-57.85,3.04-4.32,5.79-8.84,8.14-13.54,20.5-43.47,30.26-92.3,26.63-140.33-1.65-21.39-6.21-42.57-13.47-62.85,16.13,40.11,20.16,84.72,13.77,127.39-4.03,26.77-11.61,53.11-23.07,77.69-12.3,24.55-33.06,44.11-56.46,58.05-16.52,9.61-35.32,17-54.74,16.71-30.07-2.48-58.94-15.12-82.13-34.22,0,0-6.22-5.32-6.22-5.32-3.88-3.72-7.98-7.55-11.51-11.62-5.49-6.01-10.67-12.46-15.19-19.21-1.27-1.95-3.39-4.77-4.53-6.79,0,0-4.16-7.02-4.16-7.02-1.29-2.02-2.77-5.04-3.85-7.19,0,0-3.67-7.28-3.67-7.28l-.09-.19c-6.46-29.84-10.92-60.15-12.3-90.66-.77-18.99-.45-38.11,1.85-56.99,1.36-11.24,3.59-22.67,7.35-33.35h0Z"/>
                        <path d="M156.16,176.55s34.96-86.53,68.54-90.26c33.58-3.73,39.8,22.39,72.13,22.39s47.26-28.61,70.89-28.61,63.93,96.48,63.93,96.48c0,0,10.69-164.88-77.61-171.1C265.75-.77,128.66-32.92,156.16,176.55Z"/>
                        <g>
                          <circle cx="533.34" cy="638.18" r="169.89" transform="translate(-295.05 564.05) rotate(-45)"/>
                          <path className="cls-1" d="M533.34,473.79c90.79,0,164.39,73.6,164.39,164.39s-73.6,164.39-164.39,164.39-164.39-73.6-164.39-164.39,73.6-164.39,164.39-164.39m0-11c-23.67,0-46.64,4.64-68.27,13.79-20.89,8.83-39.64,21.48-55.75,37.58-16.1,16.1-28.75,34.86-37.58,55.75-9.15,21.63-13.79,44.6-13.79,68.27s4.64,46.64,13.79,68.27c8.83,20.89,21.48,39.64,37.58,55.75,16.1,16.1,34.86,28.75,55.75,37.58,21.63,9.15,44.6,13.79,68.27,13.79s46.64-4.64,68.27-13.79c20.89-8.83,39.64-21.48,55.75-37.58,16.1-16.1,28.75-34.86,37.58-55.75,9.15-21.63,13.79-44.6,13.79-68.27s-4.64-46.64-13.79-68.27c-8.83-20.89-21.48-39.64-37.58-55.75-16.1-16.1-34.86-28.75-55.75-37.58-21.63-9.15-44.6-13.79-68.27-13.79h0Z"/>
                        </g>
                        <g>
                          <g className="cls-5">
                            <g>
                              <polygon className="cls-1" points="505.21 687.25 476.6 637.7 505.21 588.15 562.43 588.15 591.03 637.7 562.43 687.25 505.21 687.25"/>
                              <path d="M559.83,592.65l26.01,45.05-26.01,45.05h-52.02l-26.01-45.05,26.01-45.05h52.02m5.2-9h-62.41l-2.6,4.5-26.01,45.05-2.6,4.5,2.6,4.5,26.01,45.05,2.6,4.5h62.41l2.6-4.5,26.01-45.05,2.6-4.5-2.6-4.5-26.01-45.05-2.6-4.5h0Z"/>
                            </g>
                            <g>
                              <polygon className="cls-1" points="421.8 825.28 393.19 775.73 421.8 726.17 479.01 726.17 507.62 775.73 479.01 825.28 421.8 825.28"/>
                              <path d="M476.42,730.67l26.01,45.05-26.01,45.05h-52.02l-26.01-45.05,26.01-45.05h52.02m5.2-9h-62.41l-2.6,4.5-26.01,45.05-2.6,4.5,2.6,4.5,26.01,45.05,2.6,4.5h62.41l2.6-4.5,26.01-45.05,2.6-4.5-2.6-4.5-26.01-45.05-2.6-4.5h0Z"/>
                            </g>
                            <g>
                              <polygon className="cls-1" points="669.1 687.25 640.49 637.7 669.1 588.15 726.31 588.15 754.92 637.7 726.31 687.25 669.1 687.25"/>
                              <path d="M723.72,592.65l26.01,45.05-26.01,45.05h-52.02l-26.01-45.05,26.01-45.05h52.02m5.2-9h-62.41l-2.6,4.5-26.01,45.05-2.6,4.5,2.6,4.5,26.01,45.05,2.6,4.5h62.41l2.6-4.5,26.01-45.05,2.6-4.5-2.6-4.5-26.01-45.05-2.6-4.5h0Z"/>
                            </g>
                            <g>
                              <polygon className="cls-1" points="583.79 820.48 555.18 770.93 583.79 721.38 641 721.38 669.61 770.93 641 820.48 583.79 820.48"/>
                              <path d="M638.41,725.88l26.01,45.05-26.01,45.05h-52.02l-26.01-45.05,26.01-45.05h52.02m5.2-9h-62.41l-2.6,4.5-26.01,45.05-2.6,4.5,2.6,4.5,26.01,45.05,2.6,4.5h62.41l2.6-4.5,26.01-45.05,2.6-4.5-2.6-4.5-26.01-45.05-2.6-4.5h0Z"/>
                            </g>
                            <g>
                              <polygon className="cls-1" points="341.28 686.29 312.67 636.74 341.28 587.19 398.5 587.19 427.11 636.74 398.5 686.29 341.28 686.29"/>
                              <path d="M395.9,591.69l26.01,45.05-26.01,45.05h-52.02l-26.01-45.05,26.01-45.05h52.02m5.2-9h-62.41l-2.6,4.5-26.01,45.05-2.6,4.5,2.6,4.5,26.01,45.05,2.6,4.5h62.41l2.6-4.5,26.01-45.05,2.6-4.5-2.6-4.5-26.01-45.05-2.6-4.5h0Z"/>
                            </g>
                            <g>
                              <polygon className="cls-1" points="421.8 552.1 393.19 502.55 421.8 452.99 479.01 452.99 507.62 502.55 479.01 552.1 421.8 552.1"/>
                              <path d="M476.42,457.5l26.01,45.05-26.01,45.05h-52.02l-26.01-45.05,26.01-45.05h52.02m5.2-9h-62.41l-2.6,4.5-26.01,45.05-2.6,4.5,2.6,4.5,26.01,45.05,2.6,4.5h62.41l2.6-4.5,26.01-45.05,2.6-4.5-2.6-4.5-26.01-45.05-2.6-4.5h0Z"/>
                            </g>
                            <g>
                              <polygon className="cls-1" points="583.79 551.14 555.18 501.59 583.79 452.04 641 452.04 669.61 501.59 641 551.14 583.79 551.14"/>
                              <path d="M638.41,456.54l26.01,45.05-26.01,45.05h-52.02l-26.01-45.05,26.01-45.05h52.02m5.2-9h-62.41l-2.6,4.5-26.01,45.05-2.6,4.5,2.6,4.5,26.01,45.05,2.6,4.5h62.41l2.6-4.5,26.01-45.05,2.6-4.5-2.6-4.5-26.01-45.05-2.6-4.5h0Z"/>
                            </g>
                          </g>
                          <circle className="cls-4" cx="533.34" cy="638.18" r="164.39"/>
                        </g>
                        <line className="cls-3" x1="601.87" y1="751.76" x2="559.7" y2="682.75"/>
                        <line className="cls-3" x1="464.8" y1="747.93" x2="507.94" y2="682.75"/>
                        <line className="cls-3" x1="399.62" y1="637.7" x2="667.5" y2="638.18"/>
                        <line className="cls-3" x1="507.94" y1="592.65" x2="464.8" y2="527.47"/>
                        <line className="cls-3" x1="559.7" y1="592.65" x2="601.87" y2="523.63"/>
                      </svg>
                    </span>
                    <span className="flex flex-col items-start text-left">
                      <span className="font-display text-[26px] font-black uppercase tracking-[0.08em] text-white/85 transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_14px_rgba(126,255,195,0.4)]">
                        PlayManager
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 font-display text-[12px] font-black uppercase tracking-[0.16em] text-white/35 transition-all duration-300 group-hover:text-[#c7f6df]">
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
                <DisplayHeading as="h2" size="md" className="text-[var(--gr-text)] drop-shadow-[0_0_10px_rgba(139,92,246,0.28)]">
                  {String(sectionGames.title ?? "თამაშები")}
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
                        <Image src={game.coverUrl} alt={game.nameKa} fill sizes="(max-width: 640px) 100vw, 480px" className="object-cover opacity-60 mix-blend-luminosity transition-all duration-700 group-hover:opacity-100 group-hover:scale-105 group-hover:mix-blend-normal z-[1]" />
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
                <DisplayHeading as="h2" size="md" className="text-[var(--gr-text)] drop-shadow-[0_0_10px_rgba(236,72,153,0.28)]">
                  {String(sectionFreeGames.title ?? "PC თამაშები უფასოდ")}
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
                feedSeed.suggestedUsers.length > 0 || feedSeed.lfgPosts.length > 0 ? (
                  <HomeFeedSeed suggestedUsers={feedSeed.suggestedUsers} lfgPosts={feedSeed.lfgPosts} />
                ) : (
                  <div className="pubg-loadout-link group relative block transition-all duration-500" data-variant="strike">
                    <div className="pubg-loadout-card relative overflow-hidden p-16 text-center flex flex-col items-center">
                      <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                      <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
                      <div className="relative z-[1] flex flex-col items-center">
                        <Flame className="mb-4 h-10 w-10 text-[var(--gr-magenta)]/85 drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]" />
                        <p className="text-[14px] text-[var(--gr-text-mute)] font-medium">ჯერ არცერთი პოსტი არ არის. გახდი პირველი ვინც დაწერს!</p>
                      </div>
                    </div>
                  </div>
                )
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
                                  <Link href={author?.username ? `/profile/${author.username}` : "#"} className="relative z-10 font-display text-[15px] font-black uppercase tracking-[0.04em] text-white transition-colors hover:text-[#D0F8FF] hover:drop-shadow-[0_0_8px_rgba(0,230,255,0.45)]">
                                    {name}
                                  </Link>
                                  {created && (
                                    <span className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
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

                            {/* Reactions — deferred: each instance hydrates and
                                fires a /reactions fetch on mount, so a screenful
                                of posts would do both ×N on load. Mount them as
                                they near the viewport instead. */}
                            <div className="relative z-10 mt-4">
                              <DeferMount minHeight={34}>
                                <PostReactions postId={p.id} hideHeading />
                              </DeferMount>
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
            
            {/* Sidebar Column — mobile hides this below the feed (redundant with
                the announcements/search quick-nav tiles above); desktop keeps it
                as the actual sidebar. */}
            <div className="hidden lg:block lg:col-span-4 space-y-6">
              <div className="pubg-loadout-link group relative block" data-variant="room">
                <div className="pubg-loadout-card relative overflow-hidden p-6">
                  <span aria-hidden className="pubg-loadout-field absolute inset-0" />
                  <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]" />
                  <div className="relative z-[1]">
                    <h3 className="font-display text-[12px] font-black uppercase tracking-[0.2em] mb-5 text-[#D0F8FF]/80">
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
                    <h3 className="font-display text-[12px] font-black uppercase tracking-[0.2em] mb-5 text-[#D0F8FF]/80">
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
