"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const cutSm = "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)";

export function FavoriteGameButton({ slug }: { slug: string }) {
  const [favorited, setFavorited] = useState(false);
  const [allSlugs, setAllSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setReady(true); return; }

      const { data } = await supabase
        .from("profiles")
        .select("favorite_game_slugs")
        .eq("id", user.id)
        .maybeSingle();

      const slugs: string[] = Array.isArray(data?.favorite_game_slugs) ? data.favorite_game_slugs : [];
      setAllSlugs(slugs);
      setFavorited(slugs.includes(slug));
      setReady(true);
    })();
  }, [slug]);

  const toggle = async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("ფავორიტებში დასამატებლად შედი ანგარიშში.");
      return;
    }

    const next = favorited
      ? allSlugs.filter((s) => s !== slug)
      : [...allSlugs, slug];

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteGameSlugs: next }),
      });
      if (!res.ok) throw new Error();
      setAllSlugs(next);
      setFavorited(!favorited);
      toast.success(favorited ? "ფავორიტებიდან წაიშალა" : "ფავორიტებში დაემატა ✓");
    } catch {
      toast.error("შეცდომა — სცადე თავიდან.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
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
