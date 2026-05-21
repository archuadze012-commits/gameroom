"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mockGames } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";

type Props = {
  fallbackSlugs: string[];
  isOwner: boolean;
  userId?: string;
};

export function ProfileFavoriteGames({ fallbackSlugs, isOwner, userId }: Props) {
  const [slugs, setSlugs] = useState(fallbackSlugs);

  useEffect(() => {
    if (!isOwner || !userId) return;
    try {
      const raw = localStorage.getItem(`gameroom_profile_${userId}`);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.favoriteGameSlugs) && saved.favoriteGameSlugs.length > 0) {
          setSlugs(saved.favoriteGameSlugs);
        } else {
          setSlugs([]);
        }
      } else {
        setSlugs([]);
      }
    } catch {}
  }, [isOwner, userId]);

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
