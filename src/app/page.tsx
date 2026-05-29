import Link from "next/link";
import { MessageCircle, Search, MessageSquare, Bell, Gamepad2, ShoppingBag, Users, Trophy, Flame } from "lucide-react";
import { mockGames, crackedGames } from "@/lib/mock-data";
import { HomeNotificationsWidget } from "@/components/home-notifications-widget";
import { HomeSearchWidget } from "@/components/home-search-widget";
import { getSession } from "@/lib/auth";
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
import { GamerCard } from "@/components/ui/gamer-card";

export const dynamic = "force-dynamic";

type HomePost = {
  id: string;
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

const COL_MAGENTA = "rgba(236,72,153,0.55)";
const COL_VIOLET  = "rgba(167,139,250,0.55)";
const COL_AMBER   = "rgba(245,165,36,0.55)";
const COL_CYAN    = "rgba(34,211,238,0.55)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.55))";
const cutClipSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cutClipMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";

export default async function HomePage() {
  const user = await getSession().catch(() => null);
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
  const bottomGames = await getSiteContentValue("home.bottom.games", {
    eyebrow: "კატალოგი",
    title: "თამაშები",
    description: "ნახე ყველა მხარდაჭერილი თამაში.",
    href: "/games",
  });
  const bottomLfg = await getSiteContentValue("home.bottom.lfg", {
    eyebrow: "გუნდი",
    title: "LIVE ლოკალი",
    description: "შემოუერთდი მოთამაშეებს.",
    href: "/lfg",
  });
  const bottomTournaments = await getSiteContentValue("home.bottom.tournaments", {
    eyebrow: "ჩემპიონატი",
    title: "ტურნირები",
    description: "დარეგისტრირდი ან უყურე.",
    href: "/tournaments",
  });

  type ArticleItem = { kind: "article"; slug: string; title: string; excerpt: string | null; cover_url: string | null; game_name: string | null; author_username: string; published_at: string; date: number };
  type PostItem = { kind: "post"; post: HomePost; date: number };
  type FeedItem = ArticleItem | PostItem;

  let feedItems: FeedItem[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const [postsRes, articleRows] = await Promise.all([
      supabase
        .from("posts")
        .select("id, content, media_urls, likes_count, created_at, profiles!posts_author_id_profiles_id_fk(username, display_name, avatar_url)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
      listPublishedArticles(4).catch(() => []),
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
  } catch (e) {
    console.error("[HomePage] Exception during fetch:", e);
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 space-y-14">
        {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="relative isolate">
          {/* faint violet/magenta light leaks */}
          <span aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/25 blur-[120px]" />
          <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-[var(--gr-magenta)]/20 blur-[120px]" />

          {!user ? (
            <div className="mx-auto max-w-3xl text-center">
              <div className="flex justify-center mb-6">
                <EditableImage
                  siteKey="home.guest.hero"
                  field="logoUrl"
                  value={String(guestHero.logoUrl ?? "/logo.png")}
                  alt="Gameroom"
                  imgClassName="w-24 h-24 rounded-2xl"
                  folder="home"
                  label="ლოგო"
                />
              </div>
              <DisplayHeading as="h1" size="lg">
                <EditableText
                  siteKey="home.guest.hero"
                  field="headline"
                  value={String(guestHero.headline ?? "ყველაფერი, რის გამოც თამაშები გიყვარს")}
                  multiline
                  as="span"
                  label="ჰედლაინი (Guest)"
                />
              </DisplayHeading>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <GoogleSignInButton className="w-full sm:w-auto min-w-[280px]" />
              </div>
            </div>
          ) : (
            <div>
              {/* quick nav */}
              <div className="mt-6 hidden md:grid md:grid-cols-5 gap-3">
                {QUICK_NAV.map(({ icon: Icon, label, href }) => (
                  <Link key={href} href={href} className="group flex flex-col items-center gap-2 p-4 text-[12px] font-semibold uppercase tracking-[0.12em]">
                    <span
                      className="grid h-10 w-10 place-items-center rounded-lg transition-all duration-200 group-hover:scale-110"
                      style={{
                        background: "rgba(236,72,153,0.08)",
                        outline: "1px solid rgba(236,72,153,0.35)",
                        boxShadow: "0 0 10px rgba(236,72,153,0.2), inset 0 0 8px rgba(236,72,153,0.08)",
                      }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{
                          color: "#ffffff",
                          filter: "drop-shadow(0 0 6px rgba(236,72,153,1)) drop-shadow(0 0 12px rgba(236,72,153,0.7))",
                        }}
                      />
                    </span>
                    <span
                      style={{
                        color: "#ffffff",
                        textShadow: "0 0 8px rgba(236,72,153,1), 0 0 18px rgba(236,72,153,0.7), 0 0 30px rgba(236,72,153,0.4)",
                      }}
                    >
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
              {/* primary CTA */}
              <GamerCard color={COL_MAGENTA} clipSize={22} hover className="mt-4">
                <div className="p-6 sm:p-7">
                  <DisplayHeading as="h2" size="md" className="text-center relative z-10" style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,1), 0 0 20px rgba(236,72,153,0.7), 0 0 40px rgba(236,72,153,0.4)" }}>
                    <EditableText siteKey="home.user.cta" field="heading" value={String(userCta.heading ?? "")} as="span" label="CTA Heading" />
                  </DisplayHeading>
                  <p className="mx-auto mt-3 max-w-2xl text-center text-[14px] leading-relaxed relative z-10" style={{ color: "#ffffff", textShadow: "0 0 6px rgba(236,72,153,0.9), 0 0 16px rgba(236,72,153,0.6), 0 0 28px rgba(236,72,153,0.3)" }}>
                    <EditableText siteKey="home.user.cta" field="description" value={String(userCta.description ?? "")} multiline as="span" label="CTA Description" />
                  </p>
                  <div className="mt-5 flex justify-center relative z-10">
                    <ChevronButton href={String(userCta.buttonHref ?? "/lfg")} variant="ghost" size="md" className="border-[var(--gr-border)] bg-[var(--gr-bg-1)] hover:border-[rgba(236,72,153,0.6)]" style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,1), 0 0 18px rgba(236,72,153,0.6)" }}>
                      <EditableText siteKey="home.user.cta" field="buttonLabel" value={String(userCta.buttonLabel ?? "დაწყება")} as="span" label="ბუტონის წარწერა" />
                    </ChevronButton>
                  </div>
                </div>
              </GamerCard>
            </div>
          )}
        </section>

        {/* â”€â”€ GAMES STRIP (mobile + tablet) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!user && (
          <section className="grid gap-10 lg:grid-cols-2">
            {/* Left: Games */}
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <DisplayHeading as="h2" size="md" className="mt-2">
                    <EditableText
                      siteKey="home.section.games"
                      field="title"
                      value={String(sectionGames.title ?? "თამაშები")}
                      as="span"
                      label="სექციის ტიტული — თამაშები"
                    />
                  </DisplayHeading>
                </div>
                <Link
                  href="/auth/login?next=%2Fgames"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gr-violet-hi)] transition-colors hover:text-[var(--gr-violet)]"
                >
                  ყველა
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {mockGames.slice(0, 4).map((game) => (
                  <Link key={game.slug} href={`/games/${game.slug}`} className="group block">
                    <div className="relative isolate transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)]" style={{ background: 'var(--card-border-hover, ' + cardBorder + ')', padding: 1, clipPath: cutClipSm }}>
                      <div className="relative h-24 overflow-hidden bg-[var(--gr-bg-1)]" style={{ clipPath: cutClipSm }}>
                        {game.coverUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={game.coverUrl} alt={game.nameKa} className="absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity group-hover:opacity-60" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-1)] via-transparent to-transparent" />
                        <div className="relative flex h-full items-end p-3 px-4">
                          <h4 className="font-display text-[13px] font-bold uppercase tracking-tight text-[var(--gr-text)] drop-shadow-md">{game.nameKa}</h4>
                        </div>
                        {/* Hover Effects (Button Style) */}
                        <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                            <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: Free PC Games */}
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <DisplayHeading as="h2" size="md" className="mt-2">
                    <EditableText
                      siteKey="home.section.free_games"
                      field="title"
                      value={String(sectionFreeGames.title ?? "PC თამაშები უფასოდ")}
                      as="span"
                      label="სექციის ტიტული — უფასო თამაშები"
                    />
                  </DisplayHeading>
                </div>
                <Link
                  href="/auth/login?next=%2Ffree-pc-games"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gr-violet-hi)] transition-colors hover:text-[var(--gr-violet)]"
                >
                  ყველა
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {crackedGames.slice(0, 4).map((game) => (
                  <Link key={game.id} href={`/free-pc-games/${game.id}`} className="group block">
                    <div className="relative isolate transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)]" style={{ background: 'var(--card-border-hover, ' + cardBorder + ')', padding: 1, clipPath: cutClipSm }}>
                      <div className="relative h-24 overflow-hidden bg-[var(--gr-bg-1)]" style={{ clipPath: cutClipSm }}>
                        {game.coverUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={game.coverUrl} alt={game.title} className="absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity group-hover:opacity-60" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-1)] via-transparent to-transparent" />
                        <div className="relative flex h-full items-end justify-between p-3 px-4 z-10">
                          <h4 className="font-display text-[13px] font-bold uppercase tracking-tight text-[var(--gr-text)] drop-shadow-md">{game.title}</h4>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[var(--gr-amber)] drop-shadow-md">{game.rating}</span>
                          </div>
                        </div>
                        {/* Hover Effects (Button Style) */}
                        <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                            <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* â”€â”€ POSTS FEED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* ── POSTS FEED ────────────────────────────── */}
        {user && (
          <section className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-4">
              {feedItems.length === 0 ? (
                <div
                  className="relative bg-[var(--gr-bg-1)] py-12 text-center text-[14px] text-[var(--gr-text-mute)] ring-1 ring-[var(--gr-border)]"
                  style={{ clipPath: cutClipMd }}
                >
                  <Flame className="mx-auto mb-2 h-5 w-5 text-[var(--gr-amber)]" />
                  ჯერ არცერთი პოსტი არ არის. გახდი პირველი ვინც დაწერს!
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1">
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
                        <GamerCard color={COL_MAGENTA} hover>
                          <div className="relative overflow-hidden">
                            <Link href={`/profile/${author?.username ?? "user"}/${p.id}`} className="absolute inset-0 z-[1]" aria-label="პოსტის გახსნა" />
                            <div className="relative z-[2] flex flex-col">
                              {/* Author & Content */}
                              <div className="p-4 pb-0 flex items-start gap-4">
                                {author?.username ? (
                                  <Link href={`/profile/${author.username}`} className="relative z-[3]">
                                    <Avatar className="h-14 w-14 shrink-0 border-2 border-[var(--gr-border-hi)] hover:opacity-85 transition-opacity" style={{ boxShadow: "0 0 10px rgba(236,72,153,0.4)" }}>
                                      <AvatarImage src={author?.avatar_url ?? undefined} alt={name} />
                                      <AvatarFallback className="bg-[var(--gr-violet)]/15 text-base text-[var(--gr-violet-hi)]">
                                        {initial}
                                      </AvatarFallback>
                                    </Avatar>
                                  </Link>
                                ) : (
                                  <Avatar className="h-14 w-14 shrink-0 border-2 border-[var(--gr-border-hi)]" style={{ boxShadow: "0 0 10px rgba(236,72,153,0.4)" }}>
                                    <AvatarImage src={author?.avatar_url ?? undefined} alt={name} />
                                    <AvatarFallback className="bg-[var(--gr-violet)]/15 text-base text-[var(--gr-violet-hi)]">
                                      {initial}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    {author?.username ? (
                                      <Link
                                        href={`/profile/${author.username}`}
                                        className="relative z-[3] text-[18px] font-bold transition-colors"
                                        style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 18px rgba(236,72,153,0.5)" }}
                                      >
                                        {name}
                                      </Link>
                                    ) : (
                                      <span
                                        className="text-[18px] font-bold"
                                        style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 18px rgba(236,72,153,0.5)" }}
                                      >
                                        {name}
                                      </span>
                                    )}
                                    {created && (
                                      <span
                                        className="text-[12px]"
                                        style={{ color: "rgba(255,255,255,0.7)", textShadow: "0 0 6px rgba(236,72,153,0.7)" }}
                                      >
                                        · {created}
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className="mt-1 line-clamp-3 whitespace-pre-line text-[14.5px] pointer-events-none select-none"
                                    style={{ color: "#ffffff", textShadow: "0 0 6px rgba(236,72,153,0.8), 0 0 16px rgba(236,72,153,0.45), 0 0 28px rgba(236,72,153,0.25)" }}
                                  >
                                    {p.content}
                                  </p>
                                </div>
                              </div>

                              {/* Full-bleed Photo */}
                              {p.media_urls && p.media_urls.length > 0 && (
                                <div className="mt-3 w-full border-y border-[var(--gr-border)] bg-[var(--gr-bg-2)] overflow-hidden pointer-events-none">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={p.media_urls[0]}
                                    alt=""
                                    className="w-full h-auto block opacity-100"
                                  />
                                </div>
                              )}

                              {/* Reactions */}
                              <div className="px-4 py-1 relative z-[3] mt-2">
                                <PostReactions postId={p.id} hideHeading />
                              </div>

                              <Separator className="border-border/40 mx-4 my-1" />

                              {/* Comments */}
                              <div className="p-4 pt-2 flex items-center gap-2 relative z-[3]">
                                <Link href={`/profile/${author?.username ?? "user"}/${p.id}#comments`} className="relative z-[3]">
                                  <Pill tone="neutral" icon={<MessageCircle className="h-3 w-3" />}>კომენტარები</Pill>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </GamerCard>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Sidebar Column */}
            <div className="lg:col-span-4 space-y-6">
              <HomeNotificationsWidget />
              <GamerCard color={COL_MAGENTA} clipSize={14}>
                <div className="p-5">
                  <h3
                    className="font-display text-[12px] font-bold uppercase tracking-[0.18em] mb-4"
                    style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 20px rgba(236,72,153,0.55), 0 0 34px rgba(236,72,153,0.3)" }}
                  >
                    მოთამაშეების ძებნა
                  </h3>
                  <HomeSearchWidget />
                </div>
              </GamerCard>

            </div>
          </section>
        )}

        {/* ── BOTTOM CTA ROW ──────────────────────────────── */}
        <section className="grid gap-4 xl:grid-cols-3">
          {[
            { siteKey: "home.bottom.games", data: bottomGames, icon: Gamepad2, color: COL_MAGENTA },
            { siteKey: "home.bottom.lfg", data: bottomLfg, icon: Users, color: COL_MAGENTA },
            { siteKey: "home.bottom.tournaments", data: bottomTournaments, icon: Trophy, color: COL_MAGENTA },
          ].map((item) => {
            const Icon = item.icon;
            const href = String(item.data.href ?? "/");
            const eyebrow = String(item.data.eyebrow ?? "");
            const title = String(item.data.title ?? "");
            const description = String(item.data.description ?? "");
            return (
              <Link key={item.siteKey} href={href} className="group block">
                <GamerCard color={item.color} clipSize={22} hover>
                  <div className="p-5">
                    <Icon
                      className="relative z-10 h-6 w-6"
                      style={{ color: "#ffffff", filter: "drop-shadow(0 0 6px rgba(236,72,153,1)) drop-shadow(0 0 14px rgba(236,72,153,0.7))" }}
                    />
                    <div className="relative z-10 mt-3">
                      <h3
                        className="mt-1.5 font-display text-[18px] font-bold uppercase"
                        style={{ color: "#ffffff", textShadow: "0 0 8px rgba(236,72,153,0.9), 0 0 20px rgba(236,72,153,0.55), 0 0 36px rgba(236,72,153,0.3)" }}
                      >
                        <EditableText siteKey={item.siteKey} field="title" value={title} as="span" label="ტიტული" />
                      </h3>
                      <p
                        className="mt-1.5 text-[12.5px]"
                        style={{ color: "#ffffff", textShadow: "0 0 6px rgba(236,72,153,0.8), 0 0 16px rgba(236,72,153,0.45), 0 0 28px rgba(236,72,153,0.25)" }}
                      >
                        <EditableText siteKey={item.siteKey} field="description" value={description} multiline as="span" label="აღწერა" />
                      </p>
                    </div>
                  </div>
                </GamerCard>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
