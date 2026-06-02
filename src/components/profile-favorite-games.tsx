"use client";

import { useState } from "react";
import Link from "next/link";
import { mockGames } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";

type Props = {
  fallbackSlugs: string[];
  isOwner: boolean;
  userId?: string;
};

function getInitialFavoriteSlugs(fallbackSlugs: string[], isOwner: boolean, userId?: string) {
  if (!isOwner || !userId || typeof window === "undefined") return fallbackSlugs;
  try {
    const raw = localStorage.getItem(`gameroom_profile_${userId}`);
    if (!raw) return [];
    const saved = JSON.parse(raw) as { favoriteGameSlugs?: string[] };
    return Array.isArray(saved.favoriteGameSlugs) && saved.favoriteGameSlugs.length > 0
      ? saved.favoriteGameSlugs
      : [];
  } catch {
    return fallbackSlugs;
  }
}

export function ProfileFavoriteGames({ fallbackSlugs, isOwner, userId }: Props) {
  const [slugs] = useState(() => getInitialFavoriteSlugs(fallbackSlugs, isOwner, userId));

  const games = slugs
    .map((slug) => mockGames.find((g) => g.slug === slug))
    .filter(Boolean)
    .slice(0, 3) as typeof mockGames;

  if (games.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {games.map((g) => (
        <Link key={g.slug} href={`/games/${g.slug}`}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-secondary/30 transition-all hover:border-primary/40 hover:bg-secondary/60">
            <GameIcon game={g} size="md" />
          </div>
        </Link>
      ))}
    </div>
  );
}
