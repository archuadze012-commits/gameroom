import Link from "next/link";
import { ArrowRight, Trophy, Users, MessageSquare, Newspaper, Gamepad2, Zap } from "lucide-react";
import { GameIcon } from "@/components/game-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockGames, mockNews, mockTournaments } from "@/lib/mock-data";

export default function HomePage() {
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
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/auth/signup">
                  პორტალის გახსნა <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/lfg">გუნდის ძებნა</Link>
              </Button>
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

      <section className="container mx-auto grid gap-10 px-4 lg:grid-cols-2">
        <div>
          <SectionHeader
            icon={<Newspaper className="h-5 w-5" />}
            title="ბოლო ამბები"
            subtitle="რა ხდება გეიმინგ სამყაროში"
            href="/news"
            compact
          />
          <div className="space-y-3">
            {mockNews.map((n) => (
              <Link key={n.slug} href={`/news/${n.slug}`} className="block">
                <Card className="overflow-hidden border-border/60 transition-colors hover:border-primary/40">
                  <CardContent className="flex gap-4 p-4">
                    <div className={`h-20 w-20 shrink-0 rounded-md bg-gradient-to-br ${n.cover}`} />
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-semibold">{n.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.excerpt}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{n.publishedAt}</span>
                        <span>· {n.readMinutes} წთ კითხვა</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader
            icon={<Trophy className="h-5 w-5" />}
            title="მომავალი ჩემპიონატები"
            subtitle="დაარეგისტრირდი ან უყურე"
            href="/tournaments"
            compact
          />
          <div className="space-y-3">
            {mockTournaments.map((t) => {
              const game = mockGames.find((g) => g.slug === t.gameSlug);
              return (
                <Link key={t.slug} href={`/tournaments/${t.slug}`} className="block">
                  <Card className="overflow-hidden border-border/60 transition-colors hover:border-primary/40">
                    <div className={`h-1.5 w-full bg-gradient-to-r ${t.banner}`} />
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {game?.emoji} {game?.nameKa}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                      <h3 className="font-semibold">{t.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>🏆 {t.prizePool}</span>
                        <span>👥 {t.participants.current}/{t.participants.max}</span>
                        <span>🗓 {t.startsAt}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-4 px-4 md:grid-cols-2">
        <Card className="border-border/60">
          <CardContent className="space-y-3 p-8">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h3 className="text-xl font-semibold">ფორუმი</h3>
            <p className="text-sm text-muted-foreground">
              დისკუსიები თამაშებზე, ტექნიკაზე და კომუნიტიზე. შენი იდეები, კითხვები — ჩვენი თემი
              დაგეხმარება.
            </p>
            <Button asChild variant="outline">
              <Link href="/forum">ფორუმზე გადასვლა <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="space-y-3 p-8">
            <Zap className="h-8 w-8 text-accent" />
            <h3 className="text-xl font-semibold">ცოცხალი ჩათი</h3>
            <p className="text-sm text-muted-foreground">
              თამაშების მიხედვით კანალები, LFG-ის ჩათები და ერთიანი ქართული გეიმერული ჩათი.
            </p>
            <Button asChild variant="outline">
              <Link href="/chat">ჩათში შესვლა <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
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

function StatusBadge({ status }: { status: "open" | "checkin" | "live" | "completed" }) {
  const map = {
    open: { label: "რეგისტრაცია", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    checkin: { label: "Check-in", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    live: { label: "🔴 ცოცხალი", className: "bg-red-500/15 text-red-400 border-red-500/30" },
    completed: { label: "დასრულდა", className: "bg-muted text-muted-foreground border-border" },
  };
  const cfg = map[status];
  return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
}
