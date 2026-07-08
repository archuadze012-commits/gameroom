"use client";

import { useEffect, useState } from "react";
import { NAV_BADGE_POLL_INTERVAL_MS } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type NavProfile = {
  username: string;
  displayName: string;
  avatarUrl: string;
  role?: string;
};

export type NavAnnouncement = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  created_at: string;
};

export type AnnouncementsSnapshot = {
  announcements: NavAnnouncement[];
  readIds: string[];
};

type UseNavProfileOptions = {
  localCache?: boolean;
};

// ── Shared pollers ──────────────────────────────────────────────
// The header, mobile nav, webview nav and notification bell all need the same
// unread counts. Before this, each mount ran its own fetch + interval, so a
// single page load fired /api/announcements 3× and /api/conversations/
// unread-count 2×. A module-level poller keeps ONE in-flight request and ONE
// interval per endpoint no matter how many components subscribe; the interval
// stops when the last subscriber unmounts.
function createSharedPoller<T>(fetcher: () => Promise<T | undefined>, intervalMs: number) {
  const listeners = new Set<(data: T) => void>();
  let last: T | undefined;
  let timer: number | null = null;
  let inFlight: Promise<void> | null = null;

  function tick() {
    if (inFlight) return;
    inFlight = (async () => {
      try {
        const data = await fetcher();
        if (data !== undefined) {
          last = data;
          listeners.forEach((cb) => cb(data));
        }
      } catch {
        /* keep last known value */
      } finally {
        inFlight = null;
      }
    })();
  }

  return function subscribe(cb: (data: T) => void) {
    listeners.add(cb);
    if (last !== undefined) cb(last);
    if (listeners.size === 1) {
      tick();
      timer = window.setInterval(tick, intervalMs);
    } else if (last === undefined) {
      tick(); // no-op if a request is already in flight
    }
    return () => {
      listeners.delete(cb);
      if (listeners.size === 0 && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
  };
}

const subscribeUnreadMessages = createSharedPoller<number>(async () => {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return 0;
  const res = await fetch("/api/conversations/unread-count");
  if (!res.ok) return undefined;
  const data = await res.json();
  return typeof data?.count === "number" ? data.count : 0;
}, NAV_BADGE_POLL_INTERVAL_MS);

const subscribeAnnouncements = createSharedPoller<AnnouncementsSnapshot>(async () => {
  const res = await fetch("/api/announcements");
  if (!res.ok) return undefined;
  const data = await res.json();
  return {
    announcements: data.announcements ?? [],
    readIds: data.readIds ?? [],
  };
}, NAV_BADGE_POLL_INTERVAL_MS);

// `enabled` gates the polling loop: guests never have unread messages or
// per-user announcement reads, so callers pass their known auth state and we
// skip the subscription (and its getSession/fetch work) entirely for visitors.
export function useNavMessageCount(enabled: boolean = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Guests start (and stay) at 0 — never polled, so nothing to reset here.
    if (!enabled) return;
    return subscribeUnreadMessages(setCount);
  }, [enabled]);

  return count;
}

// Full unread list — used by the notification bell (needs title/body/severity
// for the dropdown). Shares the same poller as the count hook below.
export function useUnreadAnnouncements(enabled: boolean = true) {
  const [unread, setUnread] = useState<NavAnnouncement[]>([]);

  useEffect(() => {
    if (!enabled) return;
    return subscribeAnnouncements(({ announcements, readIds }) => {
      const readSet = new Set(readIds);
      setUnread(announcements.filter((a) => !readSet.has(a.id)));
    });
  }, [enabled]);

  return unread;
}

export function useNavAnnouncementCount(enabled: boolean = true) {
  return useUnreadAnnouncements(enabled).length;
}

// ── Shared profile fetch ────────────────────────────────────────
// Desktop header and mobile nav both mount useNavProfile, which used to mean
// two identical session reads + two `profiles` queries per page load. The
// session+row lookup is shared through one module-level promise; the
// localStorage caching side effects stay per-caller.
type SharedProfileResult = {
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null;
  dbProfile: { username: string | null; display_name: string | null; avatar_url: string | null; role?: string } | null;
};

let sharedProfilePromise: Promise<SharedProfileResult> | null = null;

function loadSharedProfile(): Promise<SharedProfileResult> {
  if (sharedProfilePromise) return sharedProfilePromise;
  sharedProfilePromise = (async () => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return { user: null, dbProfile: null };
    const { data: dbProfile } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle();
    return { user, dbProfile: dbProfile ?? null };
  })().catch((e) => {
    sharedProfilePromise = null; // allow retry on next mount
    throw e;
  });
  return sharedProfilePromise;
}

export function useNavProfile({ localCache = false }: UseNavProfileOptions = {}) {
  const [profile, setProfile] = useState<NavProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { user, dbProfile } = await loadSharedProfile();
        if (cancelled) return;
        if (!user) {
          setProfile(null);
          return;
        }

        const key = `gameroom_profile_${user.id}`;
        const raw = localCache ? localStorage.getItem(key) : null;
        const stored = raw ? JSON.parse(raw) : {};

        const username: string =
          dbProfile?.username ||
          stored.username ||
          (user.user_metadata?.username as string | undefined) ||
          user.email?.split("@")[0] ||
          "";
        if (!username) return;

        const displayName: string =
          dbProfile?.display_name ||
          stored.displayName ||
          (user.user_metadata?.display_name as string | undefined) ||
          username;

        const avatars = localCache ? JSON.parse(localStorage.getItem("gameroom_avatars") ?? "{}") : {};
        const avatarUrl: string =
          dbProfile?.avatar_url ||
          avatars[username] ||
          (user.user_metadata?.avatar_url as string | undefined) ||
          "/default-avatar.svg";

        if (localCache) {
          localStorage.setItem(key, JSON.stringify({ ...stored, username, displayName }));
          if (dbProfile?.avatar_url) {
            avatars[username] = dbProfile.avatar_url;
            localStorage.setItem("gameroom_avatars", JSON.stringify(avatars));
          }
        }

        setProfile({ username, displayName, avatarUrl, role: dbProfile?.role });
      } catch {
        if (!cancelled) setProfile(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [localCache]);

  return profile;
}
