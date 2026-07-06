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

type UseNavProfileOptions = {
  localCache?: boolean;
};

export function useNavMessageCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          setCount(0);
          return;
        }

        const res = await fetch("/api/conversations/unread-count");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setCount(typeof data?.count === "number" ? data.count : 0);
      } catch {}
    }

    tick();
    const id = window.setInterval(tick, NAV_BADGE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return count;
}

export function useNavAnnouncementCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const readSet = new Set<string>(data.readIds ?? []);
        const unread = (data.announcements ?? []).filter((item: { id: string }) => !readSet.has(item.id));
        setCount(unread.length);
      } catch {}
    }

    tick();
    const id = window.setInterval(tick, NAV_BADGE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return count;
}

export function useNavProfile({ localCache = false }: UseNavProfileOptions = {}) {
  const [profile, setProfile] = useState<NavProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;
        if (cancelled) return;
        if (!user) {
          setProfile(null);
          return;
        }

        const key = `gameroom_profile_${user.id}`;
        const raw = localCache ? localStorage.getItem(key) : null;
        const stored = raw ? JSON.parse(raw) : {};

        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url, role")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;

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
