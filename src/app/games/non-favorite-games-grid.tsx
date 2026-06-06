"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { FavoriteGameButton } from "@/components/favorite-game-button";
import { GameCoverImage } from "@/components/game-cover-image";
import { type MockGame } from "@/lib/mock-data";
import { GameCard } from "./game-card";

function CatalogGameCard({ game }: { game: MockGame }) {
  return (
    <div className="relative h-64 w-full overflow-hidden">
      
      {/* cover image or fallback */}
      <GameCoverImage
        slug={game.slug}
        name={game.nameKa}
        coverUrl={game.coverUrl}
        accent={game.accent}
        className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-100 group-hover:mix-blend-normal"
      />

      {/* dark gradients for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,12,30,0.95)] via-[rgba(15,12,30,0.4)] to-transparent pointer-events-none" />
      
      {/* ambient color overlay on hover */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-red-500/0 duration-500 group-hover:bg-red-500/10 mix-blend-overlay" />

      {/* game name — bottom left */}
      <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-col justify-end">
        <h3
          className="font-display text-[22px] font-black uppercase tracking-wide text-white drop-shadow-md transition-colors duration-300 group-hover:text-red-300 group-hover:drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"
        >
          {game.nameKa}
        </h3>
      </div>

      {/* favorite button — top right, always visible */}
      <div className="absolute right-4 top-4 z-30">
        <FavoriteGameButton slug={game.slug} />
      </div>

      <Link href={`/games/${game.slug}`} className="absolute inset-0 z-20" aria-label={game.nameKa} />
    </div>
  );
}

export function NonFavoriteGamesGrid({ games }: { games: MockGame[] }) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const normalized = query.toLowerCase().trim();
  const filteredGames = useMemo(() => {
    if (!normalized) return games;
    return games.filter((game) =>
      game.nameKa.toLowerCase().includes(normalized) ||
      game.nameEn.toLowerCase().includes(normalized) ||
      game.slug.toLowerCase().includes(normalized) ||
      game.description.toLowerCase().includes(normalized),
    );
  }, [games, normalized]);

  return (
    <section>
      <div className="mb-8 max-w-xl">
        <div className="relative group">
          <div className={`relative flex items-center overflow-visible rounded-[12px] border border-white/10 bg-[var(--gr-bg-1)] backdrop-blur-md transition-all duration-300 premium-nav-item-glow ${isFocused ? 'premium-nav-item-glow-active shadow-[0_0_20px_rgba(239,68,68,0.2)]' : ''}`}>
            <div className="pl-4 pr-2">
              <Search className={`h-4 w-4 transition-colors duration-300 ${isFocused ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-white/40'}`} />
            </div>
            <input
              type="text"
              placeholder="მოძებნე თამაში..."
              className="h-12 w-full bg-transparent border-0 px-2 text-[14px] font-medium text-white outline-none placeholder:text-white/40 shadow-none focus-visible:ring-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <div className="pr-5 pl-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/30">
              {filteredGames.length}
            </div>
          </div>
        </div>
      </div>

      {filteredGames.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGames.map((game) => (
            <GameCard key={game.slug}>
              <CatalogGameCard game={game} />
            </GameCard>
          ))}
        </div>
      ) : (
        <div className="relative w-full overflow-visible rounded-[20px] bg-[rgba(15,12,30,0.8)] py-16 text-center backdrop-blur-md premium-card-glow-tight group">
          <div className="relative z-10">
            <Search className="mx-auto mb-3 h-8 w-8 opacity-70" style={{ color: "#ffffff", filter: "drop-shadow(0 0 6px rgba(196,30,58,0.9))" }} />
            <p className="text-[14px] text-[rgba(255,255,255,0.75)] font-medium" style={{ textShadow: "0 0 6px rgba(196,30,58,0.7)" }}>
              &quot;{query}&quot;-ზე შედეგი ვერ მოიძებნა.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
