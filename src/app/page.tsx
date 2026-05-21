import Link from "next/link";
import { ArrowRight, Rss, Heart, MessageCircle, Search, MessageSquare, Bell, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

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

export default async function HomePage() {
  const user = await getSession().catch(() => null);

  // recent public feed posts
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
    <div className="space-y-12 pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className={`container mx-auto px-4 ${user ? "py-6" : "pb-20 pt-16 md:pt-24"}`}>
          <div className="mx-auto max-w-3xl text-center">
            {!user && (
              <>
                <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
                  ქართველი გეიმერების{" "}
                  <span className="text-primary">პორტალი</span>
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
                  იპოვე გუნდი, შეუერთდი ჩემპიონატებს და იპოვე ერთგულესი მოთამაშეები eFootball, FIFA,
                  PUBG, Warzone და Valorant-ში — ერთ ადგილას.
                </p>
              </>
            )}
            {user ? (
              <div className="mx-auto max-w-2xl">
                {/* Hero CTA */}
                <div className="rounded-2xl border border-[#1e2a44] bg-gradient-to-br from-indigo-600 to-cyan-500 p-8 text-center shadow-lg">
                  <h2 className="text-2xl font-bold text-white md:text-3xl">
                    იპოვე გუნდი წამებში
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-balance text-sm text-white/90 md:text-base">
                    აარჩიე თამაში, შექმენი LFG და დაიწყე თამაში ქართველებთან
                  </p>
                  <Link
                    href="/lfg"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-6 py-3 font-bold text-black transition-colors hover:bg-cyan-300"
                  >
                    დაიწყე ახლავე →
                  </Link>
                </div>

                {/* Quick nav */}
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {[
                    { icon: Search,        label: "ძებნა",     href: "/search" },
                    { icon: Gamepad2,      label: "თამაშები",  href: "/tamashebi" },
                    { icon: MessageSquare, label: "მესენჯერი", href: "/messages" },
                    { icon: Bell,          label: "უწყებები",  href: "/announcements" },
                  ].map(({ icon: Icon, label, href }) => (
                    <Link
                      key={href}
                      href={href}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-[#1e2a44] bg-[#0a0f1e] py-4 text-center text-xs font-medium text-muted-foreground transition-all hover:border-cyan-400/40 hover:bg-[#0f1626]"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400 shadow-[0_0_12px_2px_rgba(34,211,238,0.25)] transition-shadow group-hover:shadow-[0_0_18px_4px_rgba(34,211,238,0.4)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/auth/signup">
                    დარეგისტრირდი <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <GoogleSignInButton className="w-full sm:w-auto" />
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(to right, oklch(1 0 0 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.05) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />
        </div>
      </section>

      {/* Posts feed */}
      <section className="container mx-auto px-4">
        <SectionHeader
          icon={<Rss className="h-5 w-5" />}
          title="ბოლო პოსტები"
          subtitle="ახალი მესიჯები კომიუნითიდან"
        />
        {recentPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1e2a44] py-10 text-center text-sm text-[#9fb3d1]">
            ჯერ არცერთი პოსტი არ არის. გახდი პირველი ვინც დაწერს!
          </div>
        ) : (
          <div className="space-y-3">
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
                    className="block rounded-2xl border border-[#1e2a44] bg-[#0f1626] p-4 transition-colors hover:border-cyan-400/40"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0 border border-border/60">
                        <AvatarImage src={author?.avatar_url ?? undefined} alt={name} />
                        <AvatarFallback className="bg-primary/15 text-xs text-primary">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold">{name}</span>
                          {created && (
                            <span className="text-xs text-[#9fb3d1]">· {created}</span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-foreground/90">
                          {p.content}
                        </p>
                        {p.media_urls && p.media_urls.length > 0 && (
                          <div
                            className={`mt-2 grid gap-2 ${
                              p.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"
                            }`}
                          >
                            {p.media_urls.slice(0, 4).map((url, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={i}
                                src={url}
                                alt=""
                                className="max-h-[600px] w-full rounded-lg border border-[#1e2a44] bg-[#0a0f1c] object-contain"
                              />
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-xs text-[#9fb3d1]">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" /> {p.likes_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" /> კომენტარი
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
            })}
          </div>
        )}
      </section>

    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  href,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-end justify-between ${compact ? "mb-4" : "mb-6"}`}>
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Link href={href}>
            ყველა <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
