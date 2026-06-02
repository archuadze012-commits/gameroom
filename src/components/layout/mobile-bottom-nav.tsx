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

        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

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

        const avatars = JSON.parse(localStorage.getItem("gameroom_avatars") ?? "{}");
        const avatarUrl: string =
          dbProfile?.avatar_url ||
          avatars[username] ||
          (user.user_metadata?.avatar_url as string | undefined) ||
          "/default-avatar.svg";

        localStorage.setItem(key, JSON.stringify({ ...stored, username, displayName }));
        if (dbProfile?.avatar_url) {
          avatars[username] = dbProfile.avatar_url;
          localStorage.setItem("gameroom_avatars", JSON.stringify(avatars));
        }

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

  useEffect(() => {
    const id = window.setTimeout(() => setMoreOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

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
      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 gap-1 rounded-[28px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(11,8,22,0.9),rgba(5,4,11,0.95))] p-1.5 shadow-[0_20px_54px_rgba(0,0,0,0.7),inset_0_0_26px_rgba(139,92,246,0.1)] backdrop-blur-2xl xl:hidden">
        <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(139,92,246,0.55)] to-[rgba(236,72,153,0.45)]" />
        <span aria-hidden className="pointer-events-none absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-[rgba(236,72,153,0.35)] via-[rgba(34,211,238,0.3)] to-transparent" />
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[22px] text-[9px] font-black uppercase tracking-[0.09em] transition-all duration-300 ${
                active
                  ? "bg-[linear-gradient(135deg,rgba(236,72,153,0.18),rgba(139,92,246,0.12))] text-pink-400 drop-shadow-[0_0_12px_rgba(236,72,153,0.6)] shadow-[0_0_26px_rgba(236,72,153,0.25)] ring-1 ring-[rgba(236,72,153,0.3)] scale-105"
                  : "text-white/75 hover:bg-white/[0.05] hover:text-pink-400 hover:drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]"
              }`}
            >
              <span className={`relative grid h-7 w-7 place-items-center rounded-2xl ${active ? "text-pink-400" : "text-white/80"}`}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2.0} />
                {badge != null && badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[9px] font-black text-white shadow-[0_0_12px_rgba(236,72,153,0.85)] border border-pink-400">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span>{label}</span>
              {active && (
                <span className="absolute -top-[2px] left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.9)]" />
              )}
            </Link>
          );
        })}

        {/* მეტი */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[22px] text-[9px] font-black uppercase tracking-[0.09em] transition-all duration-300 ${
            moreOpen
              ? "bg-[linear-gradient(135deg,rgba(236,72,153,0.2),rgba(139,92,246,0.1))] text-pink-400 drop-shadow-[0_0_12px_rgba(236,72,153,0.6)] shadow-[0_0_26px_rgba(236,72,153,0.25)] ring-1 ring-[rgba(236,72,153,0.3)] scale-105"
              : "text-white/75 hover:bg-white/[0.05] hover:text-pink-400 hover:drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]"
          }`}
          aria-label="მეტი მენიუს გახსნა"
        >
          {moreOpen ? <X className="h-5 w-5 text-pink-400" /> : <Menu className="h-5 w-5" />}
          <span>მეტი</span>
        </button>
      </nav>

      {/* "მეტი" sheet */}
      {moreOpen && (
        <div
          ref={sheetRef}
          className="fixed bottom-[5.75rem] left-3 right-3 z-50 overflow-hidden rounded-[30px] border border-[rgba(236,72,153,0.25)] bg-[linear-gradient(145deg,rgba(13,9,27,0.95),rgba(5,4,12,0.98))] shadow-[0_26px_76px_rgba(0,0,0,0.75),0_0_34px_rgba(236,72,153,0.15)] backdrop-blur-3xl xl:hidden"
        >
          {/* Profile header */}
          {profile ? (
            <div className="relative flex items-center gap-3 overflow-hidden border-b border-[rgba(236,72,153,0.2)] bg-[radial-gradient(circle_at_0_0,rgba(236,72,153,0.15),transparent_50%)] px-4 py-4">
              <span aria-hidden className="absolute right-5 top-0 h-px w-24 bg-pink-500 shadow-[0_0_18px_rgba(236,72,153,0.8)]" />
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="relative h-12 w-12 flex-shrink-0 rounded-2xl border border-[rgba(255,255,255,0.15)] object-cover shadow-[0_0_22px_rgba(236,72,153,0.3)]"
              />
              <div className="relative min-w-0 flex-1">
                <p className="truncate text-[15px] font-black text-white">{profile.displayName}</p>
                <Link
                  href={`/profile/${profile.username}`}
                  onClick={() => setMoreOpen(false)}
                  className="mt-1 inline-flex text-xs font-black text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)] hover:underline"
                >
                  პროფილის ნახვა →
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between border-b border-[rgba(236,72,153,0.2)] bg-[radial-gradient(circle_at_0_0,rgba(236,72,153,0.1),transparent_50%)] px-4 py-4">
              <span className="text-sm text-white/70">შესული არ ხარ</span>
              <Link
                href="/auth/login"
                onClick={() => setMoreOpen(false)}
                className="text-sm font-black text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]"
              >
                შესვლა →
              </Link>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 p-3 pb-2">
            {MORE_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className="group flex min-h-20 flex-col items-center justify-center gap-2 rounded-3xl border border-white/[0.05] bg-white/[0.02] px-2 py-3 text-center text-xs font-black text-white/75 shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-[rgba(236,72,153,0.3)] hover:bg-[rgba(236,72,153,0.1)] hover:text-pink-400 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)] hover:scale-105"
              >
                <Icon className="h-5 w-5 text-white/80 transition-colors group-hover:text-pink-400" />
                <span>{label}</span>
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 px-3 pb-3">
            <Link
              href="/settings"
              onClick={() => setMoreOpen(false)}
              className="group flex min-h-14 items-center justify-center gap-2 rounded-3xl border border-white/[0.05] bg-white/[0.03] px-3 text-xs font-black text-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-400 hover:drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]"
            >
              <Settings className="h-4.5 w-4.5 text-white/80 transition-colors group-hover:text-violet-400" />
              პარამეტრები
            </Link>
            {profile ? (
              <button
                onClick={handleLogout}
                className="group flex min-h-14 items-center justify-center gap-2 rounded-3xl border border-[rgba(236,72,153,0.2)] bg-[rgba(236,72,153,0.1)] px-3 text-xs font-black text-white/80 shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-300 hover:border-pink-500/40 hover:bg-pink-500/15 hover:text-pink-400 hover:drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]"
                type="button"
              >
                <LogOut className="h-4.5 w-4.5 text-white/80 transition-colors group-hover:text-pink-400" />
                გასვლა
              </button>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
