"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Star, Monitor, Smartphone, Gamepad2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { crackedGames, mockGames, type CrackedGame } from "@/lib/mock-data";
import { GameCard as RosterGameCard } from "@/components/game-card";

type DbRow = {
  id: string;
  title: string;
  emoji: string;
  cover_url: string | null;
  release_year: number;
  rating: number;
  description: string;
  download_url: string;
  gameplay_url: string | null;
  accent: string;
  genres: string[];
  platforms: string[];
  trending: boolean;
  system_reqs: { min: { os: string; cpu: string; ram: string; gpu: string; storage: string }; rec: { os: string; cpu: string; ram: string; gpu: string; storage: string } };
};

function dbRowToGame(row: DbRow): CrackedGame {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    coverUrl: row.cover_url ?? undefined,
    releaseYear: row.release_year,
    rating: row.rating,
    description: row.description,
    downloadUrl: row.download_url,
    gameplayUrl: row.gameplay_url ?? undefined,
    accent: row.accent,
    genre: row.genres,
    platform: row.platforms,
    trending: row.trending,
    systemReqs: row.system_reqs,
  };
}

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
  const [dbGames, setDbGames] = useState<CrackedGame[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [userFavSlugs, setUserFavSlugs] = useState<string[]>([]);
  const [favCounts, setFavCounts] = useState<Record<string, number>>({});
  const [dbRosterGames, setDbRosterGames] = useState<typeof mockGames>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/cracked-games", { cache: "no-store" });
        if (!res.ok) return;
        const payload = await res.json();
        const rows: DbRow[] = payload.games ?? payload;
        setHiddenIds(new Set(payload.hiddenIds ?? []));
        setDbGames(rows.map(dbRowToGame));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        const [{ data: gamesData }, { data: profileRows }, myProfile] = await Promise.all([
          supabase.from("games").select("slug, name_ka, emoji, accent, icon_url, cover_url"),
          supabase.from("profiles").select("favorite_game_slugs"),
          user ? supabase.from("profiles").select("favorite_game_slugs").eq("id", user.id).single() : Promise.resolve({ data: null }),
        ]);

        // Fav counts
        const counts: Record<string, number> = {};
        for (const row of profileRows ?? []) {
          for (const slug of (row.favorite_game_slugs as string[] | null) ?? []) {
            counts[slug] = (counts[slug] ?? 0) + 1;
          }
        }
        setFavCounts(counts);
        setUserFavSlugs((myProfile.data?.favorite_game_slugs as string[] | null) ?? []);

        // Merge DB roster games with mockGames
        const dbSlugs = new Set((gamesData ?? []).map((g) => g.slug));
        const merged = [
          ...(gamesData ?? []).map((g) => ({
            slug: g.slug, nameKa: g.name_ka, nameEn: g.name_ka,
            description: "", accent: g.accent, emoji: g.emoji,
            iconUrl: g.icon_url ?? undefined, coverUrl: g.cover_url ?? undefined,
            players: 0, online: 0, liveLfg: 0, favoritedBy: 0,
          })),
          ...mockGames.filter((m) => !dbSlugs.has(m.slug)),
        ];
        setDbRosterGames(merged);
      } catch {}
    })();
  }, []);

  // merge DB on top of mock, then exclude hidden IDs
  const allGames = useMemo(() => {
    const byId = new Map<string, CrackedGame>();
    crackedGames.forEach((g) => byId.set(g.id, g));
    dbGames.forEach((g) => byId.set(g.id, g));
    return Array.from(byId.values()).filter((g) => !hiddenIds.has(g.id));
  }, [dbGames, hiddenIds]);

  const filtered = useMemo(() => {
    if (activeGenre === "ყველა") return allGames;
    return allGames.filter((g) => g.genre.includes(activeGenre));
  }, [activeGenre, allGames]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

  function onMouseDown(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { active: true, moved: false, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
  }
  function onMouseMove(e: React.MouseEvent) {
    const state = dragState.current;
    if (!state.active || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const delta = x - state.startX;
    if (!state.moved && Math.abs(delta) < 5) return;
    state.moved = true;
    e.preventDefault();
    scrollRef.current.style.cursor = "grabbing";
    scrollRef.current.scrollLeft = state.scrollLeft - delta;
  }
  function stopDrag() {
    dragState.current.active = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  }
  function onClick(e: React.MouseEvent) {
    if (dragState.current.moved) e.preventDefault();
  }

  const rosterBase = dbRosterGames.length > 0 ? dbRosterGames : mockGames;
  const userFavSet = new Set(userFavSlugs);
  const topGames = [...rosterBase]
    .sort((a, b) => {
      const aFav = userFavSet.has(a.slug) ? 1 : 0;
      const bFav = userFavSet.has(b.slug) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return (favCounts[b.slug] ?? b.favoritedBy ?? 0) - (favCounts[a.slug] ?? a.favoritedBy ?? 0);
    })
    .slice(0, 20);

  return (
    <div className="container mx-auto px-4 py-10 space-y-12">

      {/* Top — Games (mockGames horizontal strip of 5) */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">თამაშები</h2>
          <Link href="/games">
            <Button variant="outline" size="sm" className="border-border/60 text-muted-foreground hover:text-foreground">
              სხვა თამაშები
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          აარჩიე შენი მთავარი თამაში და იპოვე გუნდი
        </p>
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide select-none"
          style={{ cursor: "grab" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onClick={onClick}
          onDragStart={(e) => e.preventDefault()}
        >
          {topGames.map((g) => (
            <div key={g.slug} className="shrink-0 w-48">
            <RosterGameCard
              slug={g.slug}
              nameKa={g.nameKa}
              players={g.players}
              online={g.online}
              coverUrl={g.coverUrl}
              accent={g.accent}
            />
            </div>
          ))}
        </div>
      </section>

      {/* Bottom — Cracked Games */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">PC თამაშები უფასოდ</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {allGames.length} თამაში · ჟანრის, პლატფორმისა და რეიტინგის მიხედვით
        </p>
      </div>

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
            <Link key={game.id} href={`/tamashebi/${game.id}`}>
              <GameCard game={game} />
            </Link>
          ))}
        </div>
      </div>
    </div>
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
