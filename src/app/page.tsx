import Link from "next/link";
import { MessageCircle, Search, MessageSquare, Bell, Gamepad2, ShoppingBag, Users, Trophy, Flame, Zap } from "lucide-react";
import { mockGames, crackedGames } from "@/lib/mock-data";
import { HomeNotificationsWidget } from "@/components/home-notifications-widget";
import { HomeSearchWidget } from "@/components/home-search-widget";
import { getIsAdmin, getSession } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPublishedArticles } from "@/lib/articles-db";
import { ArticleCard } from "@/components/article-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { DisplayHeading } from "@/components/ui/display-heading";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Pill } from "@/components/ui/pill";
import { getSiteContentValue } from "@/lib/site-content";
import { Separator } from "@/components/ui/separator";
import { PostReactions } from "@/app/feed/[id]/post-reactions";
import { EditableText } from "@/components/admin/editable-text";
import { EditableImage } from "@/components/admin/editable-image";
import { PostComposer } from "@/components/post-composer";
import { PostOwnerActions } from "@/components/post-owner-actions";

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

function PremiumCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="group relative block rounded-[20px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] transition-all duration-500 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-1">
      <div className={`relative h-full w-full overflow-hidden rounded-[18.5px] bg-[#0a0714] ${className}`}>
        {children}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [user, isAdmin] = await Promise.all([
    getSession().catch(() => null),
    getIsAdmin().catch(() => false),
  ]);
  const guestHero = await getSiteContentValue("home.guest.hero", {
    headline: "ყველაფერი, რის გამოც თამაშები გიყვარს",
    logoUrl: "/logo.png",
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
  try {
    const supabase = await createSupabaseServerClient();
    const profilePromise = user
      ? supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null });
    const [postsRes, articleRows, profileRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, author_id, content, media_urls, likes_count, created_at, profiles!posts_author_id_profiles_id_fk(username, display_name, avatar_url)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
      listPublishedArticles(4).catch(() => []),
      profilePromise,
    ]);
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

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)] overflow-hidden">
      
      {/* ── CINEMATIC BACKGROUND ────────────────────────────── */}
      {!user ? (
        <div className="absolute inset-x-0 top-0 h-[800px] w-full select-none pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_50%)] mix-blend-screen" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.1),transparent_50%)] mix-blend-screen" />
          <div className="absolute top-0 inset-x-0 h-[200px] bg-gradient-to-b from-[rgba(15,12,30,0.8)] to-transparent" />
          <div className="absolute bottom-0 inset-x-0 h-[300px] bg-gradient-to-t from-[var(--gr-bg-0)] to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-x-0 top-0 h-[500px] w-full select-none pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_50%)] mix-blend-screen" />
          <div className="absolute bottom-0 inset-x-0 h-[300px] bg-gradient-to-t from-[var(--gr-bg-0)] to-transparent" />
        </div>
      )}

      <div className="container relative mx-auto px-4 pb-14 lg:pb-24 pt-10 lg:pt-16 space-y-16">
        
        {/* ── HEADER CONTENT ────────────────────────────── */}
        {!user ? (
          <section className="relative z-10 mx-auto max-w-5xl text-center flex flex-col items-center pt-8">
            <div className="mb-8 relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 to-pink-500/20 blur-2xl rounded-full opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
              <EditableImage
                siteKey="home.guest.hero"
                field="logoUrl"
                value={String(guestHero.logoUrl ?? "/logo.png")}
                alt="Gameroom"
                imgClassName="relative z-10 w-28 h-28 lg:w-32 lg:h-32 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.3)] transition-transform duration-700 group-hover:scale-105"
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
            {/* PRIMARY CTA - CINEMATIC BUTTON */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
              <Link
                href={String(userCta.buttonHref ?? "/lfg")}
                className="relative flex items-center justify-center gap-3 bg-[linear-gradient(180deg,rgba(15,12,30,0.9),rgba(5,5,15,0.98))] px-10 py-4 rounded-full border border-white/10 overflow-hidden transition-all duration-300"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-violet-500/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
                <Zap className="h-5 w-5 text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] relative z-10" />
                <span className="font-display font-bold uppercase tracking-widest text-[15px] text-white relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                  <EditableText siteKey="home.user.cta" field="buttonLabel" value={String(userCta.buttonLabel ?? "დაწყება")} as="span" label="ბუტონის წარწერა" />
                </span>
              </Link>
            </div>

            {/* CINEMATIC QUICK NAV */}
            <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-5 gap-4">
              {QUICK_NAV.map(({ icon: Icon, label, href }) => (
                <Link key={href} href={href} className="group block">
                  <PremiumCard className="flex flex-col items-center gap-3 p-5 text-center !rounded-[24px]">
                    <Icon className="h-8 w-8 text-white/80 transition-all duration-500 group-hover:text-violet-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_12px_rgba(139,92,246,0.8)]" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/70 transition-colors duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                      {label}
                    </span>
                  </PremiumCard>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── CINEMATIC GAMES SHOWCASE ────────────────────────────── */}
        {!user && (
          <section className="grid gap-8 lg:grid-cols-2 relative z-10">
            {/* Left: Games */}
            <div className="space-y-6">
              <div className="flex items-end justify-between px-2">
                <DisplayHeading as="h2" size="md" className="text-white drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]">
                  <EditableText siteKey="home.section.games" field="title" value={String(sectionGames.title ?? "თამაშები")} as="span" label="სექციის ტიტული" />
                </DisplayHeading>
                <Link href="/auth/login?next=%2Fgames" className="text-[11px] font-black uppercase tracking-[0.15em] text-violet-400 transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]">
                  ყველა
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {mockGames.slice(0, 4).map((game) => (
                  <Link key={game.slug} href={`/games/${game.slug}`} className="group block">
                    <PremiumCard className="!p-0 !border-white/5">
                      <div className="relative h-28 overflow-hidden">
                        {game.coverUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={game.coverUrl} alt={game.nameKa} className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity transition-all duration-700 group-hover:opacity-100 group-hover:scale-105 group-hover:mix-blend-normal" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,12,30,0.95)] via-[rgba(15,12,30,0.4)] to-transparent" />
                        <div className="relative flex h-full items-end p-4">
                          <h4 className="font-display text-[14px] font-bold uppercase tracking-wide text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(139,92,246,0.8)]">{game.nameKa}</h4>
                        </div>
                      </div>
                    </PremiumCard>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: Free PC Games */}
            <div className="space-y-6">
              <div className="flex items-end justify-between px-2">
                <DisplayHeading as="h2" size="md" className="text-white drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]">
                  <EditableText siteKey="home.section.free_games" field="title" value={String(sectionFreeGames.title ?? "PC თამაშები უფასოდ")} as="span" label="სექციის ტიტული" />
                </DisplayHeading>
                <Link href="/auth/login?next=%2Ffree-pc-games" className="text-[11px] font-black uppercase tracking-[0.15em] text-pink-400 transition-colors hover:text-white hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]">
                  ყველა
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {crackedGames.slice(0, 4).map((game) => (
                  <Link key={game.id} href={`/free-pc-games/${game.id}`} className="group block">
                    <PremiumCard className="!p-0 !border-white/5">
                      <div className="relative h-28 overflow-hidden">
                        {game.coverUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={game.coverUrl} alt={game.title} className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity transition-all duration-700 group-hover:opacity-100 group-hover:scale-105 group-hover:mix-blend-normal" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,12,30,0.95)] via-[rgba(15,12,30,0.4)] to-transparent" />
                        <div className="relative flex h-full items-end justify-between p-4 z-10">
                          <h4 className="font-display text-[14px] font-bold uppercase tracking-wide text-white drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]">{game.title}</h4>
                          <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">{game.rating}</span>
                        </div>
                      </div>
                    </PremiumCard>
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
                <PremiumCard className="!bg-[linear-gradient(180deg,rgba(15,12,30,0.8),rgba(5,5,15,0.95))]">
                  <PostComposer currentUser={composerUser} revalidatePath="/" />
                </PremiumCard>
              )}
              {feedItems.length === 0 ? (
                <PremiumCard className="py-16 text-center flex flex-col items-center">
                  <Flame className="mb-3 h-8 w-8 text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
                  <p className="text-[15px] text-white/60 font-medium">ჯერ არცერთი პოსტი არ არის. გახდი პირველი ვინც დაწერს!</p>
                </PremiumCard>
              ) : (
                <div className="grid gap-6 grid-cols-1">
                  {feedItems.map((item) => {
                    if (item.kind === "article") {
                      return (
                        <div key={`article-${item.slug}`}>
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
                      <div key={p.id} className="group block relative">
                        <PremiumCard className="!bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.08),transparent_60%),linear-gradient(180deg,rgba(15,12,30,0.65),rgba(5,5,15,0.75))]">
                          <Link href={`/profile/${author?.username ?? "user"}/${p.id}`} className="absolute inset-0 z-[1]" aria-label="პოსტის გახსნა" />
                          <div className="relative z-[2] flex flex-col">
                            
                            {/* Author Header */}
                            <div className="relative p-5 pb-2">
                              <div className="relative z-[3] flex items-start gap-4">
                                {author?.username ? (
                                  <Link href={`/profile/${author.username}`} className="relative z-[3]">
                                    <Avatar className="h-12 w-12 shrink-0 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:border-pink-500/60 hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all duration-300">
                                      <AvatarImage src={author?.avatar_url ?? undefined} alt={name} />
                                      <AvatarFallback className="bg-violet-500/10 text-base font-black text-violet-400">
                                        {initial}
                                      </AvatarFallback>
                                    </Avatar>
                                  </Link>
                                ) : (
                                  <Avatar className="h-12 w-12 shrink-0 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                                    <AvatarImage src={author?.avatar_url ?? undefined} alt={name} />
                                    <AvatarFallback className="bg-violet-500/10 text-base font-black text-violet-400">
                                      {initial}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="min-w-0 flex-1 pt-1">
                                  <div className="flex flex-col">
                                    {author?.username ? (
                                      <Link
                                        href={`/profile/${author.username}`}
                                        className="relative z-[3] text-[16px] font-black text-white hover:text-pink-400 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.6)]"
                                      >
                                        {name}
                                      </Link>
                                    ) : (
                                      <span className="text-[16px] font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                                        {name}
                                      </span>
                                    )}
                                    {created && (
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 mt-0.5">
                                        {created}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="px-5 py-2">
                               <p className="whitespace-pre-line text-[15px] pointer-events-none select-none text-white/90 leading-relaxed font-medium">
                                 {p.content}
                               </p>
                            </div>

                            {/* Full-bleed Photo */}
                            {p.media_urls && p.media_urls.length > 0 && (
                              <div className="relative z-0 mt-3 pointer-events-none px-1">
                                <div className="relative z-0 overflow-hidden border border-white/5 rounded-xl">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={p.media_urls[0]}
                                    alt=""
                                    className="relative z-0 block h-auto w-full opacity-90 transition-opacity duration-500 group-hover:opacity-100"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Reactions */}
                            <div className="px-5 py-2 relative z-[3] mt-2">
                              <PostReactions postId={p.id} hideHeading />
                            </div>

                            <Separator className="border-white/5 mx-5 my-2" />

                            {/* Comments Actions */}
                            <div className="px-5 pb-4 pt-1 flex items-center gap-2 relative z-[3]">
                              <Link href={`/profile/${author?.username ?? "user"}/${p.id}#comments`} className="relative z-[3]">
                                <Pill tone="neutral" icon={<MessageCircle className="h-3.5 w-3.5" />}>კომენტარები</Pill>
                              </Link>
                              {user && author?.username ? (
                                <PostOwnerActions
                                  postId={p.id}
                                  canEdit={p.author_id === user.id}
                                  canDelete={p.author_id === user.id || isAdmin}
                                  editHref={p.author_id === user.id ? `/profile/${author.username}/${p.id}/edit` : undefined}
                                  className="relative z-[3] ml-auto"
                                />
                              ) : null}
                            </div>
                          </div>
                        </PremiumCard>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Sidebar Column */}
            <div className="lg:col-span-4 space-y-6">
              <PremiumCard className="!bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.1),transparent_60%),linear-gradient(180deg,rgba(15,12,30,0.65),rgba(5,5,15,0.75))]">
                <div className="p-6">
                  <h3 className="font-display text-[12px] font-black uppercase tracking-[0.2em] mb-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                    უწყებები
                  </h3>
                  <HomeNotificationsWidget />
                </div>
              </PremiumCard>

              <PremiumCard className="!bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.1),transparent_60%),linear-gradient(180deg,rgba(15,12,30,0.65),rgba(5,5,15,0.75))]">
                <div className="p-6">
                  <h3 className="font-display text-[12px] font-black uppercase tracking-[0.2em] mb-5 text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]">
                    მოთამაშეების ძებნა
                  </h3>
                  <HomeSearchWidget />
                </div>
              </PremiumCard>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
