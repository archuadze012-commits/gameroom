import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users as UsersIcon, Plus } from "lucide-react";
import { GameIcon } from "@/components/game-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockGames, mockLfgPosts, mockTournaments } from "@/lib/mock-data";

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = mockGames.find((g) => g.slug === slug);
  if (!game) notFound();

  const gameLfg = mockLfgPosts.filter((p) => p.gameSlug === slug);
  const gameTournaments = mockTournaments.filter((t) => t.gameSlug === slug);

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/games"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> ყველა თამაში
      </Link>

      <div className={`relative -mx-4 mb-8 h-44 w-[calc(100%+2rem)] bg-gradient-to-br ${game.accent} px-4`}>
        <div className="container mx-auto flex h-full flex-col justify-end px-4 pb-6">
          <div className="flex items-end gap-4">
            <GameIcon game={game} size="xl" />
            <div>
              <h1 className="text-3xl font-bold">{game.nameKa}</h1>
              <p className="text-sm text-muted-foreground">{game.nameEn}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          <Card className="border-border/60">
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">{game.description}</p>
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <span>👥 {game.players.toLocaleString()} მოთამაშე</span>
                <span>📡 {game.liveLfg} ცოცხალი LFG</span>
              </div>
            </CardContent>
          </Card>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">ცოცხალი LFG</h2>
              <Button asChild size="sm">
                <Link href={`/lfg/new?game=${game.slug}`}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> ახალი LFG
                </Link>
              </Button>
            </div>
            <div className="space-y-2">
              {gameLfg.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    ამ თამაშზე ჯერ LFG არ არის — იყავი პირველი!
                  </CardContent>
                </Card>
              ) : (
                gameLfg.map((p) => (
                  <Link key={p.id} href={`/lfg/${p.id}`}>
                    <Card className="border-border/60 transition-colors hover:border-primary/40">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            @{p.authorName} · {p.createdAgo}
                          </div>
                        </div>
                        <Badge>
                          <UsersIcon className="mr-1 h-3 w-3" />
                          {p.slots.filled}/{p.slots.total}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">ჩემპიონატები</h2>
            <div className="space-y-2">
              {gameTournaments.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    დაგეგმილი ჩემპიონატი ვერ მოიძებნა.
                  </CardContent>
                </Card>
              ) : (
                gameTournaments.map((t) => (
                  <Link key={t.slug} href={`/tournaments/${t.slug}`}>
                    <Card className="border-border/60 transition-colors hover:border-primary/40">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">
                            🏆 {t.prizePool} · {t.startsAt}
                          </div>
                        </div>
                        <Badge variant="outline">{t.status}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="border-border/60">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-sm font-semibold">ჩემი ID</h3>
              <p className="text-xs text-muted-foreground">
                დაამატე შენი in-game ID, რომ მოთამაშეებმა გიპოვონ.
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/settings">დამატება</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return mockGames.map((g) => ({ slug: g.slug }));
}
