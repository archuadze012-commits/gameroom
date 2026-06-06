"use client";

import { useState } from "react";
import { getGameCoverCandidates } from "@/lib/game-cover";

type GameCoverImageProps = {
  slug: string;
  name: string;
  coverUrl?: string | null;
  accent: string;
  className?: string;
};

export function GameCoverImage({ slug, name, coverUrl, accent, className }: GameCoverImageProps) {
  const [attempt, setAttempt] = useState(0);
  const candidates = getGameCoverCandidates(slug, coverUrl);
  const src = candidates[attempt];

  if (!src) {
    return <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-20`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={className}
      onError={() => setAttempt((current) => current + 1)}
    />
  );
}
