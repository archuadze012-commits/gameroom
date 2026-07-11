"use client";

import Link from "next/link";
import { useMemo } from "react";
import { type MockGame } from "@/lib/mock-data";
import { useFavoriteSlugs } from "@/lib/use-favorite-slugs";
import { FavoriteGameButton } from "@/components/favorite-game-button";
import { GameCoverImage } from "@/components/game-cover-image";
import { GameCard } from "./game-card";
import { NonFavoriteGamesGrid } from "./non-favorite-games-grid";

function GameCardInner({ g }: { g: MockGame }) {
  return (
    <div className="relative h-48 sm:h-64 w-full overflow-hidden">
      {/* cover image or fallback */}
      <GameCoverImage
        slug={g.slug}
        name={g.nameKa}
        coverUrl={g.coverUrl}
        accent={g.accent}
        className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-100 group-hover:mix-blend-normal"
      />

      {/* dark gradients for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,12,30,0.95)] via-[rgba(15,12,30,0.4)] to-transparent pointer-events-none" />

      {/* ambient color overlay on hover */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] bg-red-500/0 duration-500 group-hover:bg-red-500/10 mix-blend-overlay" />

      {/* game name — bottom left */}
      <div className="absolute bottom-4 left-4 right-4 sm:bottom-5 sm:left-5 sm:right-5 z-20 flex flex-col justify-end">
        <h3 className="font-display text-[16px] sm:text-[22px] font-black uppercase tracking-wide text-white drop-shadow-md transition-colors duration-300 group-hover:text-red-300 group-hover:drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
          {g.nameKa}
        </h3>
      </div>

      {/* favorite button — top right, always visible */}
      <div className="absolute right-3 top-3 sm:right-4 sm:top-4 z-30">
        <FavoriteGameButton slug={g.slug} />
      </div>

      {/* stretched link */}
      <Link href={`/games/${g.slug}`} className="absolute inset-0 z-20" aria-label={g.nameKa} />
    </div>
  );
}

// The catalog itself is public and server-cacheable (ISR); the per-user
// "favorites" split is layered on here in the client, reading the viewer's
// favorite slugs from their browser session. Guests (and the first paint before
// favorites load) simply see the full catalog with no favorites section.
export function GamesCatalog({ games }: { games: MockGame[] }) {
  const favSlugs = useFavoriteSlugs();
  const favSet = useMemo(() => new Set(favSlugs), [favSlugs]);
  const favGames = useMemo(() => games.filter((g) => favSet.has(g.slug)), [games, favSet]);
  const otherGames = useMemo(() => games.filter((g) => !favSet.has(g.slug)), [games, favSet]);

  return (
    <>
      {/* favourites section */}
      {favGames.length > 0 && (
        <div className="mt-8">
          <div className="mb-6 flex items-center gap-4">
            <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-md">
              ჩემი ფავორიტები
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-red-500/40 via-red-500/10 to-transparent shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {favGames.map((g) => (
              <GameCard key={g.slug}>
                <GameCardInner g={g} />
              </GameCard>
            ))}
          </div>

          <div className="my-10 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      )}

      <div className="mt-8">
        <div className="mb-6 flex items-center gap-4">
          <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] backdrop-blur-md">
            ყველა თამაში
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-red-500/40 via-red-500/10 to-transparent shadow-[0_0_10px_rgba(239,68,68,0.4)]" />
        </div>
        <NonFavoriteGamesGrid games={otherGames} />
      </div>
    </>
  );
}
