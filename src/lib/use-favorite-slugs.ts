"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Reads the signed-in user's favorite game slugs from the browser session.
// Public catalog pages (/games, /lfg) use this so they can stay server-cacheable
// (no per-request getSession/cookie read on the server) and layer the per-user
// favorites on top client-side instead. Returns [] for guests and until loaded.
export function useFavoriteSlugs(): string[] {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("profiles")
          .select("favorite_game_slugs")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        setSlugs(Array.isArray(data?.favorite_game_slugs) ? (data!.favorite_game_slugs as string[]) : []);
      } catch {
        // Best-effort personalization — a failure just means no favorites shown.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return slugs;
}
