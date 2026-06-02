"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FileText,
  Heart,
  Home,
  MessageSquare,
  Search,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
          ? data.reduce((sum: number, item: { unread?: number }) => sum + (item.unread ?? 0), 0)
          : 0;
        setCount(total);
      } catch {}
    }

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
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
        const unread = (data.announcements ?? []).filter((item: { id: string }) => !readSet.has(item.id));
        setCount(unread.length);
      } catch {}
    }

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return count;
}

function useSideNavProfile() {
  const [profile, setProfile] = useState<{ username: string; displayName: string; avatarUrl: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) {
          setProfile(null);
          return;
        }

        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        const username =
          dbProfile?.username ||
          (user.user_metadata?.username as string | undefined) ||
          user.email?.split("@")[0] ||
          "";
        if (!username || cancelled) return;

        const displayName =
          dbProfile?.display_name ||
          (user.user_metadata?.display_name as string | undefined) ||
          username;
        const avatarUrl =
          dbProfile?.avatar_url ||
          (user.user_metadata?.avatar_url as string | undefined) ||
          "/default-avatar.svg";

        setProfile({ username, displayName, avatarUrl });
      } catch {
        if (!cancelled) setProfile(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return profile;
}

const moreLinks = [
  { href: "/lfg", label: "ლოკალი", icon: Users },
  { href: "/tournaments", label: "ჩემპიონატები", icon: Trophy },
  { href: "/leaderboard", label: "Leaderboard", icon: Star },
  { href: "/shop", label: "შოპი", icon: ShoppingBag },
];

const navPanelClassName =
  "fixed bottom-4 right-2 top-[5.25rem] z-50 hidden w-[62px] flex-col items-center justify-between overflow-hidden rounded-[20px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(15,12,30,0.65),rgba(5,5,15,0.75))] px-1.5 py-3 shadow-[0_24px_50px_rgba(0,0,0,0.8),inset_0_0_26px_rgba(139,92,246,0.1),inset_0_-18px_30px_rgba(236,72,153,0.05)] backdrop-blur-2xl gr-webview-side-nav-panel transition-all duration-500 ease-out";

const primaryActiveClassName =
  "rounded-xl border border-pink-500/40 bg-[linear-gradient(135deg,rgba(236,72,153,0.15),rgba(139,92,246,0.1))] text-white shadow-[0_0_18px_rgba(236,72,153,0.25),inset_0_0_14px_rgba(139,92,246,0.15)] scale-105";

const primaryIdleClassName =
  "rounded-xl border border-transparent bg-white/[0.02] text-[var(--gr-text)] hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white hover:shadow-[0_0_14px_rgba(139,92,246,0.2)] hover:scale-110";

const iconGlowClassName =
  "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all duration-300";

const iconActiveGlowClassName =
  "text-white [filter:drop-shadow(0_0_8px_rgba(236,72,153,0.7))_drop-shadow(0_0_12px_rgba(139,92,246,0.5))] transition-all duration-300";

export function WebViewSideNav({ canEdit = false }: { canEdit?: boolean }) {
  const pathname = usePathname();
  const msgCount = useMsgCount();
  const annCount = useAnnouncementCount();
  const profile = useSideNavProfile();

  const tabs = [
    { href: "/", label: "მთავარი", icon: Home },
    { href: "/search", label: "ძებნა", icon: Search },
    { href: "/messages", label: "მესენჯერი", icon: MessageSquare, badge: msgCount },
    { href: "/announcements", label: "უწყებები", icon: Bell, badge: annCount },
    { href: "/games", label: "ფავორიტი თამაშები", icon: Heart },
  ];

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Webview navigation"
      className={navPanelClassName}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-2 top-0 h-[2px] bg-gradient-to-r from-transparent via-[rgba(139,92,246,0.8)] to-transparent shadow-[0_0_20px_rgba(139,92,246,0.6)]" />
      <span aria-hidden className="pointer-events-none absolute inset-x-2 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[rgba(236,72,153,0.7)] to-transparent shadow-[0_0_20px_rgba(236,72,153,0.5)]" />
      <span aria-hidden className="pointer-events-none absolute inset-y-8 left-0 w-px bg-gradient-to-b from-[rgba(236,72,153,0.4)] via-[rgba(139,92,246,0.1)] to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-y-8 right-0 w-px bg-gradient-to-b from-[rgba(34,211,238,0.4)] via-[rgba(34,211,238,0.05)] to-transparent" />

      <div className="flex w-full flex-col items-center gap-2">
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              className={`relative grid h-12 w-12 place-items-center transition-all duration-300 ${
                active ? primaryActiveClassName : primaryIdleClassName
              }`}
            >
              <Icon
                className={`h-5 w-5 ${active ? iconActiveGlowClassName : iconGlowClassName}`}
                strokeWidth={active ? 2.5 : 2.0}
              />
              {badge != null && badge > 0 ? (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[9px] font-black text-white shadow-[0_0_12px_rgba(236,72,153,0.85)] border border-pink-400">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
              {active ? (
                <>
                  <span className="absolute -left-[1px] top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-md bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.8)]" />
                  <span className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/70 to-transparent" />
                  <span className="absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-pink-500/70 to-transparent" />
                </>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-3 mt-1">
        <div className="flex w-full flex-col items-center gap-2">
          <SideNavIconLink
            href="/articles"
            label="სტატიები"
            active={isActive("/articles")}
            icon={<FileText className={`h-[18px] w-[18px] ${isActive("/articles") ? iconActiveGlowClassName : iconGlowClassName}`} />}
          />

          {profile ? (
            <Link
              href={`/profile/${profile.username}`}
              aria-label="პროფილი"
              title={profile.displayName}
              className={`group grid h-10 w-10 place-items-center overflow-hidden transition-all duration-300 ${
                isActive(`/profile/${profile.username}`)
                  ? "rounded-xl border border-pink-500/50 bg-pink-500/10 shadow-[0_0_16px_rgba(236,72,153,0.3)] scale-105"
                  : "rounded-xl border border-white/10 bg-white/[0.03] hover:border-violet-500/40 hover:bg-violet-500/10 hover:scale-110"
              }`}
            >
              <Image
                src={profile.avatarUrl}
                alt={profile.displayName}
                width={32}
                height={32}
                className={`h-8 w-8 rounded-lg object-cover transition-all duration-300 ${isActive(`/profile/${profile.username}`) ? "[filter:drop-shadow(0_0_8px_rgba(236,72,153,0.6))]" : "group-hover:[filter:drop-shadow(0_0_6px_rgba(139,92,246,0.4))]"}`}
              />
            </Link>
          ) : null}

          {moreLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <SideNavIconLink
                key={href}
                href={href}
                label={label}
                active={active}
                icon={<Icon className={`h-[18px] w-[18px] ${active ? iconActiveGlowClassName : iconGlowClassName}`} />}
              />
            );
          })}
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          {canEdit ? (
            <SideNavIconLink
              href="/admin/free-pc-games"
              label="ადმინ პანელი"
              active={isActive("/admin")}
              icon={<ShieldAlert className={`h-[18px] w-[18px] ${isActive("/admin") ? iconActiveGlowClassName : iconGlowClassName}`} />}
            />
          ) : null}
          <SideNavIconLink
            href="/settings"
            label="პარამეტრები"
            active={isActive("/settings")}
            icon={<Settings className={`h-[18px] w-[18px] ${isActive("/settings") ? iconActiveGlowClassName : iconGlowClassName}`} />}
          />
        </div>
      </div>
    </nav>
  );
}

function SideNavIconLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`grid h-10 w-10 place-items-center transition-all duration-300 ${
        active
          ? "rounded-xl border border-pink-500/40 bg-pink-500/15 shadow-[0_0_14px_rgba(236,72,153,0.2)] scale-105"
          : "rounded-xl border border-transparent bg-transparent text-[var(--gr-text)] hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-white hover:scale-110"
      }`}
    >
      {icon}
    </Link>
  );
}
