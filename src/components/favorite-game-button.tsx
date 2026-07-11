"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/lib/favorites-context";

export function FavoriteGameButton({ slug }: { slug: string }) {
  const { ready, isFavorite, toggle } = useFavorites();
  const [loading, setLoading] = useState(false);

  const favorited = isFavorite(slug);

  const onClick = async () => {
    setLoading(true);
    try {
      await toggle(slug);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-pressed={favorited}
      disabled={loading}
      className={[
        "relative h-9 px-4 font-black uppercase tracking-[0.14em]",
        "text-[10px] backdrop-blur-md transition-all duration-300 rounded-[12px]",
        loading ? "animate-pulse" : "",
        favorited
          ? "bg-[rgba(239,68,68,0.15)] text-red-500 premium-nav-item-glow premium-nav-item-glow-active hover:-translate-y-0.5 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
          : "bg-white/[0.04] text-white/70 premium-nav-item-glow border border-white/5 hover:text-white hover:-translate-y-0.5",
      ].join(" ")}
      style={{
        textShadow: favorited ? "0 0 10px rgba(239,68,68,0.6)" : "none",
      }}
    >
      <div className="relative z-10 flex items-center gap-2">
        <Heart className={`h-4 w-4 transition-colors duration-300 ${favorited ? "fill-current text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : ""}`} />
        {favorited ? "ფავორიტია" : "ფავორიტებში"}
      </div>
    </Button>
  );
}
