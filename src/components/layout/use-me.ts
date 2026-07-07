"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// `resolved` is false until the browser session has actually been read, so a
// caller can tell "confirmed guest" apart from the pre-read initial state (both
// have authenticated=false). Consumers that must not act on the optimistic
// default — e.g. only showing the guest-home storm background once we KNOW the
// visitor is a guest — should gate on `resolved`.
export type Me = { authenticated: boolean; canEdit: boolean; resolved: boolean };

// Client-side auth snapshot for the site chrome. `authenticated` resolves
// instantly from the browser session (no network) so the nav doesn't flash
// guest→auth; `canEdit` (owner email allowlist, server-only) and the per-visit
// updateLastSeen side effect come from /api/me. Keeping this off the server
// layout is what lets public routes render statically.
export function useMe(): Me {
  const [me, setMe] = useState<Me>({ authenticated: false, canEdit: false, resolved: false });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) Instant: browser session tells us auth state with no round-trip.
      //    Mark `resolved` once it completes (session or not).
      let hasSession = false;
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        hasSession = !!data.session?.user;
        setMe((prev) => ({
          ...prev,
          authenticated: prev.authenticated || hasSession,
          resolved: true,
        }));
      } catch {
        if (!cancelled) setMe((prev) => ({ ...prev, resolved: true }));
      }

      // 2) Authoritative (authed only): /api/me resolves canEdit and triggers
      //    the last-seen / daily-login side effect server-side. Guests skip it —
      //    for them it always answers {false,false}, so calling it was a wasted
      //    serverless invocation on every page load.
      if (!hasSession || cancelled) return;
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { authenticated?: boolean; canEdit?: boolean };
        if (!cancelled) setMe({ authenticated: !!data.authenticated, canEdit: !!data.canEdit, resolved: true });
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
