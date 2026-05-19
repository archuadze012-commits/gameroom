import Link from "next/link";
import { ArrowRight, Gamepad2, Rss, Search } from "lucide-react";
import { GameIcon } from "@/components/game-icon";
import { Button } from "@/components/ui/button";
import { mockGames } from "@/lib/mock-data";
import { getSession } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { GameCard } from "@/components/game-card";

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
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {user ? (
                <>
                  <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                    <Link href="/search">
                      ძებნა <Search className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/feed">
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


      <section className="container mx-auto px-4">
        <SectionHeader
          icon={<Gamepad2 className="h-5 w-5" />}
          title="თამაშები"
          subtitle="აარჩიე შენი მთავარი თამაში და იპოვე გუნდი"
          href="/games"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockGames.map((g) => (
            <GameCard
              key={g.slug}
              slug={g.slug}
              nameKa={g.nameKa}
              players={g.players}
              online={g.online}
              coverUrl={g.coverUrl}
              accent={g.accent}
            />
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

