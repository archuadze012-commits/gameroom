import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, Users, Calendar, ListChecks, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockGames, mockTournaments } from "@/lib/mock-data";
import { generateSingleElimBracket } from "@/lib/tournament/generate-bracket";
import { Bracket } from "@/components/tournament/bracket";
import { MatchSummary } from "@/components/tournament/match-summary";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = mockTournaments.find((x) => x.slug === slug);
  if (!t) notFound();
  const game = mockGames.find((g) => g.slug === t.gameSlug);

  const mockParticipants = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    name: ["GeoSniper", "Lasha10", "Sage_Tbilisi", "ZeroKD", "El_Pippo", "Beka", "Nika", "Saba"][i],
    seed: i + 1,
  }));

  const { matches } = generateSingleElimBracket(mockParticipants);

  // Demo: fill some results in so the bracket looks alive
  if (t.status === "live" || t.status === "completed") {
    matches[0].score1 = 3;
    matches[0].score2 = 1;
    matches[0].winner = matches[0].player1;
    matches[0].status = "completed";
    matches[1].score1 = 2;
    matches[1].score2 = 3;
    matches[1].winner = matches[1].player2;
    matches[1].status = "completed";
    matches[2].score1 = 3;
    matches[2].score2 = 0;
    matches[2].winner = matches[2].player1;
    matches[2].status = "completed";
    matches[3].score1 = 1;
    matches[3].score2 = 3;
    matches[3].winner = matches[3].player2;
    matches[3].status = "completed";
    // propagate to round 2
    matches[4].player1 = matches[0].winner;
    matches[4].player2 = matches[1].winner;
    matches[5].player1 = matches[2].winner;
    matches[5].player2 = matches[3].winner;
    if (t.status === "completed") {
      matches[4].score1 = 3;
      matches[4].score2 = 2;
      matches[4].winner = matches[4].player1;
      matches[5].score1 = 0;
      matches[5].score2 = 3;
      matches[5].winner = matches[5].player2;
      matches[6].player1 = matches[4].winner;
      matches[6].player2 = matches[5].winner;
      matches[6].score1 = 3;
      matches[6].score2 = 1;
      matches[6].winner = matches[6].player1;
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/tournaments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> ყველა ჩემპიონატი
      </Link>

      <div className={`mb-6 h-40 rounded-xl bg-gradient-to-br ${t.banner} md:h-56`} />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{game?.emoji}</span>
            <span>{game?.nameKa}</span>
            <span>·</span>
            <span>{t.format}</span>
          </div>
          <h1 className="mt-1 text-3xl font-bold">{t.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-primary" /> {t.prizePool}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              {t.participants.current}/{t.participants.max}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> {t.startsAt}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.status === "open" && <Button size="lg">დარეგისტრირდი</Button>}
          {t.status === "checkin" && (
            <Button size="lg" variant="default">
              Check-in
            </Button>
          )}
          {t.status === "live" && (
            <Button size="lg" variant="outline">
              უყურე live
            </Button>
          )}
          <Button size="lg" variant="ghost">
            გაზიარება
          </Button>
        </div>
      </div>

      <Tabs defaultValue="bracket" className="mt-10">
        <TabsList>
          <TabsTrigger value="bracket">
            <ListChecks className="mr-1.5 h-3.5 w-3.5" /> ბრეკეტი
          </TabsTrigger>
          <TabsTrigger value="participants">
            <Users className="mr-1.5 h-3.5 w-3.5" /> მონაწილეები
          </TabsTrigger>
          <TabsTrigger value="rules">
            <BookOpen className="mr-1.5 h-3.5 w-3.5" /> წესები
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bracket" className="mt-6 space-y-4">
          <Bracket matches={matches} />
          {(t.status === "completed" || t.status === "live") && (
            <MatchSummary
              tournamentName={t.name}
              game={game?.nameKa ?? t.gameSlug}
              matches={matches}
            />
          )}
        </TabsContent>

        <TabsContent value="participants" className="mt-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {mockParticipants.map((p) => (
              <Card key={p.id} className="border-border/60">
                <CardContent className="flex items-center gap-3 p-3">
                  <Badge variant="outline" className="text-[10px]">#{p.seed}</Badge>
                  <Link
                    href={`/profile/${p.name}`}
                    className="text-sm hover:text-primary"
                  >
                    @{p.name}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <Card className="border-border/60">
            <CardContent className="space-y-3 p-6 text-sm">
              <h3 className="font-semibold">ფორმატი</h3>
              <p className="text-muted-foreground">
                Single Elimination — ერთხელ წააგებ და გასული ხარ. ფინალამდე 3 რაუნდი.
              </p>
              <h3 className="font-semibold">მატჩის წესები</h3>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Best of 3 — პირველი 2 გამარჯვებამდე.</li>
                <li>Check-in დროულად, წინააღმდეგ შემთხვევაში — DQ.</li>
                <li>Voice chat სავალდებულო ფინალში.</li>
                <li>დავის შემთხვევაში — admin-ის გადაწყვეტილება საბოლოოა.</li>
              </ul>
              <h3 className="font-semibold">ჯილდოს ფონდი</h3>
              <p className="text-muted-foreground">
                🥇 60% · 🥈 25% · 🥉 15% — ჯილდო გადაირიცხება მოგებიდან 7 დღეში.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function generateStaticParams() {
  return mockTournaments.map((t) => ({ slug: t.slug }));
}
