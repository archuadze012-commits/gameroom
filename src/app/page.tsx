import Link from "next/link";
import { ArrowRight, Users, Gamepad2, Zap, Rss, Search } from "lucide-react";
import { GameIcon } from "@/components/game-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockGames } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function HomePage() {
  const user = await getSession().catch(() => null);
  const username =
    (user?.user_metadata?.username as string | undefined) ??
    user?.email?.split("@")[0];

  return (
    <div className="space-y-20 pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="container mx-auto px-4 pb-20 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="border-primary/40 text-primary mb-6">
              <Zap className="mr-1 h-3 w-3" /> ბეტა ვერსია
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
              ქართველი გეიმერების{" "}
              <span className="text-primary">პორტალი</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
              იპოვე გუნდი, შეუერთდი ჩემპიონატებს და იპოვე ერთგულესი მოთამაშეები eFootball, FIFA,
              PUBG, Warzone და Valorant-ში — ერთ ადგილას.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {user ? (
                <>
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                    <Link href="/search">
                      ძებნა <Search className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="#feed">
                      პოსტები <Rss className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                    <Link href={`/profile/${username}`}>
                      ჩემი გვერდი
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/auth/signup">
                      დარეგისტრირდი <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <GoogleSignInButton className="w-full sm:w-auto" />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(to right, oklch(1 0 0 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.06) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>
      </section>

      {/* Feed — visible only when logged in */}
      {user && (
        <section id="feed" className="container mx-auto px-4 scroll-mt-20">
          <SectionHeader
            icon={<Rss className="h-5 w-5" />}
            title="პოსტები"
            subtitle="გამოწერილი გეიმერების პოსტები"
          />
          <Card className="border-dashed border-border/60">
            <CardContent className="flex flex-col items-center gap-4 p-12 text-center text-sm text-muted-foreground">
              <Users className="h-10 w-10 opacity-30" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">ჯერ არავინ გამოგიწერია</p>
                <p>გამოიწერე სხვა გეიმერები — მათი პოსტები აქ გამოჩნდება</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/lfg">გეიმერების ძებნა <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="container mx-auto px-4">
        <SectionHeader
          icon={<Gamepad2 className="h-5 w-5" />}
          title="თამაშები"
          subtitle="აარჩიე შენი მთავარი თამაში და იპოვე გუნდი"
          href="/games"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockGames.map((g) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="group">
              <Card className="relative h-56 overflow-hidden border-border/60 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                {g.coverUrl ? (
                  <img
                    src={g.coverUrl}
                    alt={g.nameKa}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${g.accent}`} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white transition-colors group-hover:text-primary">
                        {g.nameKa}
                      </h3>
                      <p className="text-xs text-white/60">{g.players.toLocaleString()} მოთამაშე</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {g.players.toLocaleString()}
                      </Badge>
                      <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-500/40">
                        🟢 {g.online}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
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

