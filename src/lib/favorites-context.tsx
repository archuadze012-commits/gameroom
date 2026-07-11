"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Single shared source of the viewer's favorite game slugs for a whole page.
//
// Before this existed, every <FavoriteGameButton> and the catalog's favorites
// split each ran their OWN `auth.getUser()` (a network round-trip that
// re-validates the JWT against the auth server) + `profiles` select. On /games
// that meant ~1 pair PER game card — a dozen-plus identical auth + DB requests
// racing the browser's 6-connections-per-host cap, which is why the page (and
// the favorites section in particular) loaded slowly. The provider does it ONCE
// and every consumer reads the shared state.

type FavoritesContextValue = {
  /** Initial load has settled (whether authed, guest, or errored). */
  ready: boolean;
  isAuthed: boolean;
  slugs: string[];
  isFavorite: (slug: string) => boolean;
  toggle: (slug: string) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        setIsAuthed(true);
        const { data } = await supabase
          .from("profiles")
          .select("favorite_game_slugs")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        setSlugs(Array.isArray(data?.favorite_game_slugs) ? (data!.favorite_game_slugs as string[]) : []);
      } catch {
        // Best-effort personalization — a failure just means no favorites shown.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isFavorite = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggle = useCallback(
    async (slug: string) => {
      if (!isAuthed) {
        toast.error("ფავორიტებში დასამატებლად შედი ანგარიშში.");
        return;
      }
      const has = slugs.includes(slug);
      const next = has ? slugs.filter((s) => s !== slug) : [...slugs, slug];
      const prev = slugs;
      setSlugs(next); // optimistic
      try {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ favoriteGameSlugs: next }),
        });
        if (!res.ok) throw new Error();
        toast.success(has ? "ფავორიტებიდან წაიშალა" : "ფავორიტებში დაემატა ✓");
      } catch {
        setSlugs(prev); // revert on failure
        toast.error("შეცდომა — სცადე თავიდან.");
      }
    },
    [isAuthed, slugs],
  );

  return (
    <FavoritesContext.Provider value={{ ready, isAuthed, slugs, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a <FavoritesProvider>");
  return ctx;
}
