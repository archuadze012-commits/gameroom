"use client";

import { useState } from "react";
import type { MockGame } from "@/lib/mock-data";

type Props = {
  game: Pick<MockGame, "emoji" | "nameKa" | "iconUrl" | "invertIcon">;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeMap = {
  sm: { img: "h-5 w-5", emoji: "text-lg" },
  md: { img: "h-8 w-8", emoji: "text-2xl" },
  lg: { img: "h-12 w-12", emoji: "text-4xl" },
  xl: { img: "h-16 w-16", emoji: "text-6xl" },
};

export function GameIcon({ game, size = "md" }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const s = sizeMap[size];
  const src = game.iconUrl;

  if (src && failedSrc !== src) {
    return (
      <span className="relative inline-flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={game.nameKa}
          className={`${s.img} object-contain${game.invertIcon ? " brightness-0 invert" : ""}`}
          onError={() => setFailedSrc(src)}
        />
      </span>
    );
  }
  return <span className={s.emoji}>{game.emoji}</span>;
}
