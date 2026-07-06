"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type Me = { authenticated: boolean; canEdit: boolean };

// Client-side auth snapshot for the site chrome. `authenticated` resolves
// instantly from the browser session (no network) so the nav doesn't flash
// guest→auth; `canEdit` (owner email allowlist, server-only) and the per-visit
// updateLastSeen side effect come from /api/me. Keeping this off the server
// layout is what lets public routes render statically.
export function useMe(): Me {
  const [me, setMe] = useState<Me>({ authenticated: false, canEdit: false });

  useEffect(() => {
    let cancelled = false;

    // 1) Instant: browser session tells us auth state with no round-trip.
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session?.user) {
          setMe((prev) => (prev.authenticated ? prev : { ...prev, authenticated: true }));
        }
      } catch {
        /* ignore */
      }
    })();

    // 2) Authoritative: /api/me confirms auth, resolves canEdit, and triggers
    //    the last-seen / daily-login side effect server-side.
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Me;
        if (!cancelled) setMe({ authenticated: !!data.authenticated, canEdit: !!data.canEdit });
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return me;
}
