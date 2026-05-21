"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
      variant={favorited ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={favorited ? "gap-1.5" : "gap-1.5 border-border/60"}
    >
      <Heart className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} />
      {favorited ? "ფავორიტია" : "ფავორიტებში"}
    </Button>
  );
}
