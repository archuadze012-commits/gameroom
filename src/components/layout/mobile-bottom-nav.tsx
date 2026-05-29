"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, MessageSquare, Bell, Menu, X, Search, Trophy, Gamepad2, Users, Settings, Star, ShoppingBag, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function useMobileProfile() {
  const [profile, setProfile] = useState<{ username: string; displayName: string; avatarUrl: string } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const key = `gameroom_profile_${user.id}`;
        const raw = localStorage.getItem(key);
        const stored = raw ? JSON.parse(raw) : {};

        const username: string =
          stored.username ||
          (user.user_metadata?.username as string | undefined) ||
          user.email?.split("@")[0] ||
          "";
        if (!username) return;

        const displayName: string =
          stored.displayName ||
          (user.user_metadata?.display_name as string | undefined) ||
          username;

        const avatars = JSON.parse(localStorage.getItem("gameroom_avatars") ?? "{}");
        const avatarUrl: string =
          avatars[username] ||
          (user.user_metadata?.avatar_url as string | undefined) ||
          "/default-avatar.svg";

        setProfile({ username, displayName, avatarUrl });
      } catch {}
    })();
  }, []);
  return profile;
}

function useMsgCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setCount(0);
          return;
        }
        const res = await fetch("/api/conversations");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const total = Array.isArray(data)
          ? data.reduce((s: number, c: { unread: number }) => s + (c.unread ?? 0), 0)
          : 0;
        setCount(total);
      } catch {}
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return count;
}

function useAnnouncementCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/announcements");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const readSet = new Set<string>(data.readIds ?? []);
        const unread = (data.announcements ?? []).filter((a: { id: string }) => !readSet.has(a.id));
        setCount(unread.length);
      } catch {}
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return count;
}

const MORE_LINKS = [
  { href: "/articles", label: "სტატიები", icon: FileText },
  { href: "/games", label: "თამაშები", icon: Gamepad2 },
  { href: "/lfg", label: "ლოკალი", icon: Users },
  { href: "/tournaments", label: "ჩემპიონატები", icon: Trophy },
  { href: "/leaderboard", label: "Leaderboard", icon: Star },
  { href: "/shop", label: "შოპი", icon: ShoppingBag },
  { href: "/settings", label: "პარამეტრები", icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const msgCount = useMsgCount();
  const annCount = useAnnouncementCount();
  const profile = useMobileProfile();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setMoreOpen(false);
    router.push("/");
    router.refresh();
  };

  // close "more" when navigating
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // close on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const tabs = [
    { href: "/", label: "მთავარი", icon: Home },
    { href: "/search", label: "ძებნა", icon: Search },
    { href: "/messages", label: "მესენჯერი", icon: MessageSquare, badge: msgCount },
    { href: "/announcements", label: "უწყებები", icon: Bell, badge: annCount },
  ];

  return (
    <>
      {/* bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-[var(--gr-border)] bg-[rgba(8,6,15,0.92)] backdrop-blur-xl xl:hidden">
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gr-violet)]/40 to-transparent" />
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                active ? "text-[var(--gr-violet-hi)]" : "text-[var(--gr-text-mute)] hover:text-[var(--gr-text)]"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {badge != null && badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--gr-grad-violet)] px-1 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(139,92,246,0.6)]">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span>{label}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 h-[2px] w-10 -translate-x-1/2 bg-[var(--gr-violet)] shadow-[0_0_10px_rgba(139,92,246,0.7)]" />
              )}
            </Link>
          );
        })}

        {/* მეტი */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
            moreOpen ? "text-[var(--gr-violet-hi)]" : "text-[var(--gr-text-mute)] hover:text-[var(--gr-text)]"
          }`}
        >
          {moreOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span>მეტი</span>
        </button>
      </nav>

      {/* "მეტი" sheet */}
      {moreOpen && (
        <div
          ref={sheetRef}
          className="fixed bottom-16 left-0 right-0 z-50 border-t border-border/60 bg-background/98 backdrop-blur-xl xl:hidden"
        >
          {/* Profile header */}
          {profile ? (
            <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="h-11 w-11 rounded-full border border-border object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{profile.displayName}</p>
                <Link
                  href={`/profile/${profile.username}`}
                  onClick={() => setMoreOpen(false)}
                  className="text-xs text-primary hover:underline"
                >
                  პროფილის ნახვა →
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                გასვლა
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">შესული არ ხარ</span>
              <Link
                href="/auth/login"
                onClick={() => setMoreOpen(false)}
                className="text-sm font-medium text-primary"
              >
                შესვლა →
              </Link>
            </div>
          )}
          <div className="grid grid-cols-3 gap-px bg-border/30 p-0">
            {MORE_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-2 bg-background px-2 py-4 text-xs text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
