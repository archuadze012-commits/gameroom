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
        "h-9 gap-2 border px-3.5 font-black uppercase tracking-[0.14em]",
        "text-[10px] backdrop-blur-md transition-all duration-300",
        loading ? "animate-pulse" : "",
        favorited
          ? "border-white/10 bg-[linear-gradient(135deg,#ec4899,#8b5cf6)] text-white hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(236,72,153,0.4)]"
          : "border-white/10 bg-white/[0.04] text-[var(--gr-text)] hover:border-pink-500/40 hover:bg-pink-500/10 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(236,72,153,0.2)]",
      ].join(" ")}
      style={{
        clipPath: cutSm,
        textShadow: favorited ? "0 0 10px rgba(255,255,255,0.4)" : "none",
        boxShadow: favorited
          ? "0 8px 24px rgba(236,72,153,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
          : "0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
      {favorited ? "ფავორიტია" : "ფავორიტებში"}
    </Button>
  );
}
