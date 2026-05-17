import Link from "next/link";
import { Trophy, Users, Calendar, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { mockGames, mockTournaments } from "@/lib/mock-data";

export const metadata = { title: "ჩემპიონატები" };

const statusLabels = {
  open: { label: "რეგისტრაცია გახსნილია", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  checkin: { label: "Check-in", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  live: { label: "🔴 ცოცხალი", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  completed: { label: "დასრულდა", className: "bg-muted text-muted-foreground border-border" },
};

export default function TournamentsPage() {
  const grouped = {
    live: mockTournaments.filter((t) => t.status === "live"),
    upcoming: mockTournaments.filter((t) => t.status === "open" || t.status === "checkin"),
    completed: mockTournaments.filter((t) => t.status === "completed"),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="ჩემპიონატები"
        description="თემიდან გასული ჩემპიონატები. დაარეგისტრირდი, უყურე, მოიგე."
        actions={
          <Button asChild variant="outline">
            <Link href="/tournaments/propose">
              <Plus className="mr-1 h-4 w-4" /> ჩემპიონატის შემოთავაზება
            </Link>
          </Button>
        }
      />

      <div className="mt-10 space-y-12">
        <Section title="🔴 ცოცხალი" tournaments={grouped.live} />
        <Section title="📅 მომავალი" tournaments={grouped.upcoming} />
        <Section title="🏁 დასრულებული" tournaments={grouped.completed} />
      </div>
    </div>
  );
}

function Section({
  title,
  tournaments,
}: {
  title: string;
  tournaments: typeof mockTournaments;
}) {
  if (tournaments.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => {
          const game = mockGames.find((g) => g.slug === t.gameSlug);
          const status = statusLabels[t.status];
          return (
            <Link key={t.slug} href={`/tournaments/${t.slug}`}>
              <Card className="h-full overflow-hidden border-border/60 transition-colors hover:border-primary/40">
                <div className={`h-2 w-full bg-gradient-to-r ${t.banner}`} />
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs">
                      {game?.emoji} {game?.nameKa}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${status.className}`}>
                      {status.label}
                    </Badge>
                  </div>
                  <h3 className="text-base font-semibold">{t.name}</h3>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-3.5 w-3.5" /> {t.prizePool}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" /> {t.participants.current}/{t.participants.max} მონაწილე
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" /> {t.startsAt}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                      {t.format}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
