import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users as UsersIcon, Plus, DoorOpen } from "lucide-react";
import { GameIcon } from "@/components/game-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockGames, mockLfgPosts, mockTournaments, type MockGame } from "@/lib/mock-data";
import { FindMatchButton } from "@/components/find-match-button";
import { FavoriteGameButton } from "@/components/favorite-game-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: dbGame } = await supabase.from("games").select("*").eq("slug", slug).single();

  const game: MockGame | undefined = dbGame
    ? {
        slug: dbGame.slug,
        nameKa: dbGame.name_ka,
        nameEn: dbGame.name_en,
        description: dbGame.description,
        accent: dbGame.accent,
        emoji: dbGame.emoji,
        iconUrl: dbGame.icon_url ?? undefined,
        coverUrl: dbGame.cover_url ?? undefined,
        players: 0,
        online: 0,
        liveLfg: 0,
        favoritedBy: 0,
      }
    : mockGames.find((g) => g.slug === slug);

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

      {/* Cover banner */}
      <div className={`relative -mx-4 h-44 w-[calc(100%+2rem)] bg-gradient-to-br ${game.accent} overflow-hidden`}>
        {game.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>

      {/* Game identity row — below the cover */}
      <div className="mb-8 flex items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-4">
          <GameIcon game={game} size="xl" />
          <h1 className="text-2xl font-bold">{game.nameKa}</h1>
        </div>
        <FavoriteGameButton slug={game.slug} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          <Card className="border-border/60">
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">{game.description}</p>
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                <span>👥 {game.players.toLocaleString("en-US")} მოთამაშე</span>
                <span>📡 {game.liveLfg} ცოცხალი LFG</span>
              </div>
            </CardContent>
          </Card>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">ცოცხალი LFG</h2>
              <div className="flex gap-2">
                <FindMatchButton gameSlug={game.slug} gameName={game.nameKa} />
                <Button asChild size="sm" variant="outline">
                  <Link href={`/lfg/new?game=${game.slug}`}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> ახალი LFG
                  </Link>
                </Button>
              </div>
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">რუმები</h2>
              <Button asChild size="sm" variant="outline">
                <Link href={`/rooms/new?game=${game.slug}`}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> ახალი რუმი
                </Link>
              </Button>
            </div>
            <Card className="border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                <DoorOpen className="mx-auto mb-2 h-6 w-6 opacity-40" />
                ამ თამაშზე ჯერ რუმი არ არის — შექმენი პირველი!
              </CardContent>
            </Card>
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

