import Link from "next/link";
import { Rss, Heart, MessageCircle, Search, MessageSquare, Bell, Gamepad2, Monitor, Rocket, Users, Trophy, Flame } from "lucide-react";
import { mockGames } from "@/lib/mock-data";
import { HomeNotificationsWidget } from "@/components/home-notifications-widget";
import { HomeFavoriteLobbies } from "@/components/home-favorite-lobbies";
import { getSession } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { GradientText } from "@/components/ui/gradient-text";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Pill } from "@/components/ui/pill";

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
];

const cutClipSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cutClipMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";

export default async function HomePage() {
  const user = await getSession().catch(() => null);

  let recentPosts: HomePost[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("posts")
      .select("id, content, media_urls, likes_count, created_at, profiles!posts_author_id_fkey(username, display_name, avatar_url)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(8);
    recentPosts = (data ?? []) as unknown as HomePost[];
  } catch {
    recentPosts = [];
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 space-y-14">
        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden">
          {/* faint violet/magenta light leaks */}
          <span aria-hidden className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/25 blur-[120px]" />
          <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-10 h-72 w-72 rounded-full bg-[var(--gr-magenta)]/20 blur-[120px]" />

          {!user ? (
            <div className="mx-auto max-w-3xl text-center">
              <Eyebrow tone="amber" className="justify-center inline-flex">ქართველი გეიმერების სახლი</Eyebrow>
              <DisplayHeading as="h1" size="display" className="mt-5">
                ერთად ვთამაშობთ.<br />
                ერთად <GradientText tone="amber">ვიგებთ</GradientText>.
              </DisplayHeading>
              <p className="mx-auto mt-6 max-w-2xl text-balance text-[15px] leading-relaxed text-[var(--gr-text-mute)]">
                იპოვე გუნდი, შეუერთდი ჩემპიონატებს და გაიცანი ქართველი გეიმერების კომუნიტი
                — eFootball, FIFA, PUBG, Warzone, Valorant.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ChevronButton href="/auth/signup" variant="violet" size="lg">
                  <Rocket className="h-4 w-4" /> დარეგისტრირდი
                </ChevronButton>
                <div className="w-full sm:w-auto"><GoogleSignInButton className="w-full sm:w-auto" /></div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <HomeFavoriteLobbies />
              {/* primary CTA — cut-corner gradient banner */}
              <div
                className="relative isolate overflow-hidden p-8 text-center text-white"
                style={{ background: "var(--gr-grad-violet)", clipPath: cutClipMd }}
              >
                <span aria-hidden className="pointer-events-none absolute right-0 top-0 h-3 w-12 bg-[var(--gr-amber)]" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }} />
                <Eyebrow tone="amber" className="justify-center inline-flex !text-[#ffd9a3]">დაიწყე ახლავე</Eyebrow>
                <DisplayHeading as="h2" size="lg" className="mt-3 !text-white">
                  იპოვე გუნდი წამებში
                </DisplayHeading>
                <p className="mx-auto mt-2 max-w-md text-balance text-[14px] text-white/85">
                  აარჩიე თამაში, შექმენი LFG და დაიწყე თამაში ქართველებთან.
                </p>
                <div className="mt-5 inline-block">
                  <ChevronButton href="/lfg" variant="amber" size="md">
                    LFG-ში გადასვლა
                  </ChevronButton>
                </div>
              </div>

              <HomeNotificationsWidget />

              {/* quick nav */}
              <div className="mt-6 hidden xl:grid grid-cols-4 gap-3">
                {QUICK_NAV.map(({ icon: Icon, label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group relative bg-[var(--gr-bg-1)] p-4 transition-transform hover:-translate-y-0.5 gr-sweep"
                    style={{ clipPath: cutClipSm }}
                  >
                    <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
                    <div className="flex flex-col items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--gr-text-mute)] group-hover:text-[var(--gr-text)]">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--gr-violet)]/12 text-[var(--gr-violet-hi)] ring-1 ring-[var(--gr-violet)]/30">
                        <Icon className="h-5 w-5" />
                      </span>
                      {label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── GAMES STRIP (mobile + tablet) ─────────────────── */}
        <section className="xl:hidden">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <Eyebrow tone="violet">თამაშები</Eyebrow>
              <DisplayHeading as="h2" size="md" className="mt-2">
                ითამაშე ნებისმიერი
              </DisplayHeading>
            </div>
            <Link href="/games" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-violet-hi)] hover:text-[var(--gr-violet)]">
              ყველა →
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {mockGames.map((game) => (
              <Link key={game.slug} href={`/games/${game.slug}`} className="group flex-none w-28 transition-transform duration-200 hover:-translate-y-0.5">
                <div
                  className="relative aspect-[3/4] w-28 overflow-hidden bg-[var(--gr-bg-1)] ring-1 ring-[var(--gr-border)] transition-all group-hover:ring-[var(--gr-violet-hi)] gr-sweep"
                  style={{ clipPath: cutClipSm }}
                >
                  {game.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={game.coverUrl} alt={game.nameKa} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">{game.emoji}</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/30 to-transparent" />
                </div>
                <p className="mt-2 truncate text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--gr-text-mute)] group-hover:text-[var(--gr-violet-hi)]">
                  {game.nameKa}
                </p>
              </Link>
            ))}
          </div>

          <Link
            href="/tamashebi"
            className="mt-4 flex w-full items-center justify-center gap-2 bg-[var(--gr-bg-1)] py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-violet-hi)] ring-1 ring-[var(--gr-border)] transition-colors hover:ring-[var(--gr-violet-hi)] hover:text-[var(--gr-violet)]"
            style={{ clipPath: cutClipSm }}
          >
            <Monitor className="h-4 w-4" /> Free PC Games
          </Link>
        </section>

        {/* ── POSTS FEED ────────────────────────────────────── */}
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <Eyebrow tone="amber">აქტივობა</Eyebrow>
              <DisplayHeading as="h2" size="md" className="mt-2 flex items-center gap-2">
                <Rss className="h-5 w-5 text-[var(--gr-amber)]" /> ბოლო პოსტები
              </DisplayHeading>
            </div>
            <Link href="/feed" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-violet-hi)] hover:text-[var(--gr-violet)]">
              ყველა →
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <div
              className="relative bg-[var(--gr-bg-1)] py-12 text-center text-[14px] text-[var(--gr-text-mute)] ring-1 ring-[var(--gr-border)]"
              style={{ clipPath: cutClipMd }}
            >
              <Flame className="mx-auto mb-2 h-5 w-5 text-[var(--gr-amber)]" />
              ჯერ არცერთი პოსტი არ არის. გახდი პირველი ვინც დაწერს!
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
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
                  <Link
                    key={p.id}
                    href="/feed"
                    className="group relative block bg-[var(--gr-bg-1)] p-4 transition-transform hover:-translate-y-0.5 gr-sweep"
                    style={{ clipPath: cutClipSm }}
                  >
                    <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0 border border-[var(--gr-border-hi)]">
                        <AvatarImage src={author?.avatar_url ?? undefined} alt={name} />
                        <AvatarFallback className="bg-[var(--gr-violet)]/15 text-xs text-[var(--gr-violet-hi)]">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[13px]">
                          <span className="font-semibold text-[var(--gr-text)]">{name}</span>
                          {created && <span className="text-[11px] text-[var(--gr-text-dim)]">· {created}</span>}
                        </div>
                        <p className="mt-1 line-clamp-3 whitespace-pre-line text-[13px] text-[var(--gr-text)]/90">
                          {p.content}
                        </p>
                        {p.media_urls && p.media_urls.length > 0 && (
                          <div className={`mt-2 grid gap-2 ${p.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                            {p.media_urls.slice(0, 4).map((url, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={url}
                                alt=""
                                className="max-h-[420px] w-full rounded-md border border-[var(--gr-border)] bg-[var(--gr-bg-2)] object-contain"
                              />
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <Pill tone="accent" icon={<Heart className="h-3 w-3" />}>{p.likes_count}</Pill>
                          <Pill tone="neutral" icon={<MessageCircle className="h-3 w-3" />}>კომენტარი</Pill>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── BOTTOM CTA ROW ────────────────────────────────── */}
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { href: "/games", icon: Gamepad2, eyebrow: "კატალოგი", title: "თამაშები", desc: "ნახე ყველა მხარდაჭერილი თამაში." },
            { href: "/lfg", icon: Users, eyebrow: "გუნდი", title: "ცოცხალი LFG", desc: "შემოუერთდი მოთამაშეებს." },
            { href: "/tournaments", icon: Trophy, eyebrow: "ჩემპიონატი", title: "ტურნირები", desc: "დარეგისტრირდი ან უყურე." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative block bg-[var(--gr-bg-1)] p-5 transition-transform hover:-translate-y-0.5 gr-sweep"
                style={{ clipPath: cutClipMd }}
              >
                <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
                <Icon className="h-6 w-6 text-[var(--gr-violet-hi)]" />
                <div className="mt-3">
                  <Eyebrow tone="amber">{item.eyebrow}</Eyebrow>
                  <h3 className="mt-1.5 font-display text-[18px] font-bold uppercase text-[var(--gr-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] text-[var(--gr-text-mute)]">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
