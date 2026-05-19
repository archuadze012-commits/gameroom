"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Star, TrendingUp, Monitor, Smartphone, Gamepad2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { crackedGames } from "@/lib/mock-data";

const ALL_GENRES = [
  "ყველა",
  "RPG",
  "Action",
  "Open World",
  "FPS",
  "Battle Royale",
  "Strategy",
  "MOBA",
  "Sandbox",
  "Sports",
  "Racing",
  "Roguelike",
  "Metroidvania",
  "Simulation",
  "Adventure",
  "Party",
  "Hero Shooter",
  "Social Deduction",
];

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  PC: <Monitor className="h-3 w-3" />,
  Mobile: <Smartphone className="h-3 w-3" />,
  PS5: <Gamepad2 className="h-3 w-3" />,
  PS4: <Gamepad2 className="h-3 w-3" />,
  Xbox: <Gamepad2 className="h-3 w-3" />,
  Switch: <Gamepad2 className="h-3 w-3" />,
};

export default function CrackedGamesPage() {
  const [activeGenre, setActiveGenre] = useState("ყველა");

  const filtered = useMemo(() => {
    if (activeGenre === "ყველა") return crackedGames;
    return crackedGames.filter((g) => g.genre.includes(activeGenre));
  }, [activeGenre]);

  const trending = crackedGames.filter((g) => g.trending);

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cracked Games</h1>
        <p className="mt-2 text-muted-foreground">
          {crackedGames.length} თამაში · ჟანრის, პლატფორმისა და რეიტინგის მიხედვით
        </p>
      </div>

      {/* Trending */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-primary" /> ტრენდულია ახლა
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((game) => (
            <TrendingCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      {/* Genre filter */}
      <div className="flex flex-wrap gap-2">
        {ALL_GENRES.map((genre) => (
          <Button
            key={genre}
            size="sm"
            variant={activeGenre === genre ? "default" : "outline"}
            className={activeGenre !== genre ? "border-border/60 text-muted-foreground hover:text-foreground" : ""}
            onClick={() => setActiveGenre(genre)}
          >
            {genre}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div>
        <p className="mb-4 text-sm text-muted-foreground">
          {filtered.length} თამაში{activeGenre !== "ყველა" && ` · ${activeGenre}`}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((game) => (
            <Link key={game.id} href={`/cracked-games/${game.id}`}>
              <GameCard game={game} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendingCard({ game }: { game: (typeof crackedGames)[0] }) {
  return (
    <Link href={`/cracked-games/${game.id}`}>
      <Card className="group relative overflow-hidden border-border/60 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 aspect-video">
        {game.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.coverUrl}
            alt={game.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${game.accent}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <Badge className="absolute top-2 right-2 bg-primary/20 text-primary border-primary/30 text-xs backdrop-blur-sm">
          <TrendingUp className="mr-1 h-3 w-3" /> Trending
        </Badge>

        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
          <div className="flex items-end justify-between gap-2">
            <h3 className="font-bold text-sm leading-tight text-white">{game.title}</h3>
            <div className="flex items-center gap-1 text-amber-400 shrink-0">
              <Star className="h-3 w-3 fill-amber-400" />
              <span className="text-xs font-semibold">{game.rating}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {game.genre.map((g) => (
              <Badge key={g} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-black/40 text-white border-white/10 backdrop-blur-sm">{g}</Badge>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function GameCard({ game }: { game: (typeof crackedGames)[0] }) {
  return (
    <Card className="group relative overflow-hidden border-border/60 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 aspect-video">
      {game.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.coverUrl}
          alt={game.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${game.accent}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
        <div className="flex items-end justify-between gap-2">
          <h3 className="font-bold text-sm leading-tight text-white">{game.title}</h3>
          <div className="flex items-center gap-1 text-amber-400 shrink-0">
            <Star className="h-3 w-3 fill-amber-400" />
            <span className="text-xs font-bold">{game.rating}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {game.genre.map((g) => (
            <Badge key={g} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-black/40 text-white border-white/10 backdrop-blur-sm">{g}</Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
