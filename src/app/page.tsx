import Link from "next/link";
import { Heart, MessageCircle, Search, MessageSquare, Bell, Gamepad2, ShoppingBag, Rocket, Users, Trophy, Flame, Monitor, Smartphone } from "lucide-react";
import { mockGames, crackedGames } from "@/lib/mock-data";
import { HomeNotificationsWidget } from "@/components/home-notifications-widget";
import { HomeSearchWidget } from "@/components/home-search-widget";
import { getSession } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Pill } from "@/components/ui/pill";
import { getSiteContentValue } from "@/lib/site-content";
import { Separator } from "@/components/ui/separator";
import { PostReactions } from "@/app/feed/[id]/post-reactions";
import { EditableText } from "@/components/admin/editable-text";
import { EditableImage } from "@/components/admin/editable-image";
import { EditableLink } from "@/components/admin/editable-link";

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

const cutClipSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cutClipMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.55))";

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

  let recentPosts: HomePost[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data: postsData, error } = await supabase
      .from("posts")
      .select("id, content, media_urls, likes_count, created_at, profiles!posts_author_id_profiles_id_fk(username, display_name, avatar_url)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(8);
      
    if (error) {
      console.error("[HomePage] Supabase fetch error:", error);
    }
    recentPosts = (postsData ?? []) as unknown as HomePost[];
  } catch (e) {
    console.error("[HomePage] Exception during fetch:", e);
    recentPosts = [];
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 space-y-14">
        {/* â”€â”€ HERO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section className="relative isolate overflow-hidden">
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
                  <div
                    key={href}
                    className="relative isolate transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)]"
                    style={{ background: 'var(--card-border-hover, transparent)', padding: 1, clipPath: cutClipSm }}
                  >
                    <Link
                      href={href}
                      className="group relative bg-[var(--gr-bg-1)] p-4 block h-full w-full"
                      style={{ clipPath: cutClipSm }}
                    >
                      {/* Hover Effects */}
                      <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                      <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                      <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />

                      <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
                      <div className="relative z-10 flex flex-col items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)] group-hover:text-[var(--gr-text)]">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--gr-violet)]/12 text-[var(--gr-violet-hi)] ring-1 ring-[var(--gr-violet)]/30">
                          <Icon className="h-5 w-5" />
                        </span>
                        {label}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
              {/* primary CTA - posts-style card */}
              <div
                className="group relative isolate mt-4 transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)]"
                style={{ background: 'var(--card-border-hover, ' + cardBorder + ')', padding: 1, clipPath: cutClipMd }}
              >
                <div
                  className="relative overflow-hidden bg-[var(--gr-bg-1)] p-6 sm:p-7"
                  style={{ clipPath: cutClipMd }}
                >
                  {/* Hover Effects */}
                  <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                  <div className="absolute inset-0 ring-1 ring-inset ring-transparent group-hover:ring-red-600/80 transition-shadow z-[5] pointer-events-none" />
                  <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />

                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]"
                  />
                  <DisplayHeading as="h2" size="md" className="text-center relative z-10">
                    <EditableText
                      siteKey="home.user.cta"
                      field="heading"
                      value={String(userCta.heading ?? "")}
                      as="span"
                      label="CTA Heading"
                    />
                  </DisplayHeading>
                  <p className="mx-auto mt-3 max-w-2xl text-center text-[14px] leading-relaxed text-[var(--gr-text-mute)] relative z-10">
                    <EditableText
                      siteKey="home.user.cta"
                      field="description"
                      value={String(userCta.description ?? "")}
                      multiline
                      as="span"
                      label="CTA Description"
                    />
                  </p>
                  <div className="mt-5 flex justify-center relative z-10">
                    <ChevronButton
                      href={String(userCta.buttonHref ?? "/lfg")}
                      variant="ghost"
                      size="md"
                      className="text-[var(--gr-violet-hi)] border-[var(--gr-border)] bg-[var(--gr-bg-1)] hover:text-[var(--gr-violet)] hover:border-[var(--gr-violet-hi)]"
                    >
                      <EditableText
                        siteKey="home.user.cta"
                        field="buttonLabel"
                        value={String(userCta.buttonLabel ?? "დაწყება")}
                        as="span"
                        label="ბუტონის წარწერა"
                      />
                    </ChevronButton>
                  </div>
                </div>
              </div>
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
              {recentPosts.length === 0 ? (
                <div
                  className="relative bg-[var(--gr-bg-1)] py-12 text-center text-[14px] text-[var(--gr-text-mute)] ring-1 ring-[var(--gr-border)]"
                  style={{ clipPath: cutClipMd }}
                >
                  <Flame className="mx-auto mb-2 h-5 w-5 text-[var(--gr-amber)]" />
                  ჯერ არცერთი პოსტი არ არის. გახდი პირველი ვინც დაწერს!
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1">
                  {recentPosts.map((p) => {
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
                        <div
                          className="relative isolate transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)]"
                          style={{ background: 'var(--card-border-hover, ' + cardBorder + ')', padding: 1, clipPath: cutClipSm }}
                        >
                          <div
                            className="relative bg-[var(--gr-bg-1)] overflow-hidden"
                            style={{ clipPath: cutClipSm }}
                          >
                            {/* Card Link Overlay — sits at z-[1] so content at z-[2]+ can be interactive */}
                            <Link href={`/profile/${author?.username ?? "user"}/${p.id}`} className="absolute inset-0 z-[1]" aria-label="პოსტის გახსნა" />

                            {/* Hover Effects */}
                            <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                            <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />

                            <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)] z-[6]" />
                            
                            <div className="relative z-[2] flex flex-col">
                              {/* Author & Content */}
                              <div className="p-4 pb-0 flex items-start gap-3">
                                {author?.username ? (
                                  <Link href={`/profile/${author.username}`} className="relative z-[3]">
                                    <Avatar className="h-10 w-10 shrink-0 border border-[var(--gr-border-hi)] hover:opacity-85 transition-opacity">
                                      <AvatarImage src={author?.avatar_url ?? undefined} alt={name} />
                                      <AvatarFallback className="bg-[var(--gr-violet)]/15 text-sm text-[var(--gr-violet-hi)]">
                                        {initial}
                                      </AvatarFallback>
                                    </Avatar>
                                  </Link>
                                ) : (
                                  <Avatar className="h-10 w-10 shrink-0 border border-[var(--gr-border-hi)]">
                                    <AvatarImage src={author?.avatar_url ?? undefined} alt={name} />
                                    <AvatarFallback className="bg-[var(--gr-violet)]/15 text-sm text-[var(--gr-violet-hi)]">
                                      {initial}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    {author?.username ? (
                                      <Link href={`/profile/${author.username}`} className="relative z-[3] text-[15px] font-semibold text-[var(--gr-text)] hover:text-primary transition-colors">
                                        {name}
                                      </Link>
                                    ) : (
                                      <span className="text-[15px] font-semibold text-[var(--gr-text)]">{name}</span>
                                    )}
                                    {created && <span className="text-[11.5px] text-[var(--gr-text-dim)]">· {created}</span>}
                                  </div>
                                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-[14.5px] text-[var(--gr-text)]/90 pointer-events-none select-none">
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

                              {/* Comments — inherits card click via overlay, pill is just visual */}
                              <div className="p-4 pt-2 flex items-center gap-2 relative z-[3]">
                                <Link href={`/profile/${author?.username ?? "user"}/${p.id}#comments`} className="relative z-[3]">
                                  <Pill tone="neutral" icon={<MessageCircle className="h-3 w-3" />}>კომენტარები</Pill>
                                </Link>
                              </div>
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
              <HomeNotificationsWidget />
              <div className="rounded-md border border-[var(--gr-border)] bg-[var(--gr-bg-1)] p-5 relative overflow-hidden">
                <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
                <h3 className="font-display text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--gr-text-mute)] mb-4">
                  მოთამაშეების ძებნა
                </h3>
                <HomeSearchWidget />
              </div>
            </div>
          </section>
        )}

        {/* ── BOTTOM CTA ROW ──────────────────────────────── */}
        <section className="grid gap-4 xl:grid-cols-3">
          {[
            { siteKey: "home.bottom.games", data: bottomGames, icon: Gamepad2 },
            { siteKey: "home.bottom.lfg", data: bottomLfg, icon: Users },
            { siteKey: "home.bottom.tournaments", data: bottomTournaments, icon: Trophy },
          ].map((item) => {
            const Icon = item.icon;
            const href = String(item.data.href ?? "/");
            const eyebrow = String(item.data.eyebrow ?? "");
            const title = String(item.data.title ?? "");
            const description = String(item.data.description ?? "");
            return (
              <Link key={item.siteKey} href={href} className="group block">
                <div
                  className="relative isolate transition-all duration-300 group-hover:[--card-border-hover:rgba(220,38,38,0.8)]"
                  style={{ background: 'var(--card-border-hover, ' + cardBorder + ')', padding: 1, clipPath: cutClipMd }}
                >
                  <div
                    className="relative bg-[var(--gr-bg-1)] p-5 overflow-hidden"
                    style={{ clipPath: cutClipMd }}
                  >
                    <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)] z-10" />
                    <Icon className="relative z-10 h-6 w-6 text-[var(--gr-violet-hi)]" />
                    <div className="relative z-10 mt-3">
                      <Eyebrow tone="amber">
                        <EditableText
                          siteKey={item.siteKey}
                          field="eyebrow"
                          value={eyebrow}
                          as="span"
                          label="Eyebrow"
                        />
                      </Eyebrow>
                      <h3 className="mt-1.5 font-display text-[18px] font-bold uppercase text-[var(--gr-text)]">
                        <EditableText
                          siteKey={item.siteKey}
                          field="title"
                          value={title}
                          as="span"
                          label="ტიტული"
                        />
                      </h3>
                      <p className="mt-1.5 text-[12.5px] text-[var(--gr-text-mute)]">
                        <EditableText
                          siteKey={item.siteKey}
                          field="description"
                          value={description}
                          multiline
                          as="span"
                          label="აღწერა"
                        />
                      </p>
                    </div>

                    {/* Hover Effects (Button Style) */}
                    <div className="absolute inset-0 bg-gr-magenta opacity-0 transition-opacity group-hover:opacity-[0.04] z-[5] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-br from-gr-magenta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-[5] pointer-events-none" />
                    <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] group-hover:transition-transform group-hover:duration-700 z-[5] pointer-events-none" />
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}