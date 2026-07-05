'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';
import {
  ArrowLeft,
  Award,
  Bell,
  Building2,
  Crown,
  Dumbbell,
  Landmark,
  MessageCircle,
  Search,
  Shield,
  ShoppingCart,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { playPlayManagerMessageSound } from '@/lib/sounds';

// ── Canonical PlayManager side navigation ─────────────────────────────────────
// Single source of truth for the left rail. Matches the design on the PlayManager
// home page; used by every shell so the nav looks identical everywhere.

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
};

const navItems: NavItem[] = [
  { label: 'ქალაქი', icon: Building2, href: '/playmanager' },
  { label: 'მატჩი', icon: Trophy, href: '/playmanager/arena?module=matchday' },
  { label: 'შემადგენლობა', icon: Shield, href: '/playmanager/arena/lineup' },
  { label: 'გუნდი', icon: UsersRound, href: '/playmanager/residence' },
  { label: 'საწვრთნელი', icon: Dumbbell, href: '/playmanager/training' },
  { label: 'მაღაზია', icon: ShoppingCart, href: '/playmanager/shop' },
  { label: 'ოფისი', icon: Landmark, href: '/playmanager/finance' },
  { label: 'ძებნა', icon: Search, href: '/playmanager/search' },
  { label: 'რეიტინგი', icon: Crown, href: '/playmanager/leaderboard' },
  { label: 'მიღწევები', icon: Award, href: '/playmanager/achievements' },
  { label: 'შეტყობინება', icon: Bell, href: '/playmanager/notifications' },
  { label: 'მესენჯერი', icon: MessageCircle, href: '/playmanager/messages' },
];

function playNavSound(href: string) {
  if (
    href.includes('/playmanager/messages') ||
    href.includes('/playmanager/chat') ||
    href.includes('module=direct_messages') ||
    href.includes('module=global_chat')
  ) {
    playPlayManagerMessageSound();
  }
}

export function PlayManagerSidebar() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/playmanager/notifications/unread', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data) => {
        if (!cancelled) setUnread(Number(data?.count) || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Re-check whenever the route changes (e.g. after visiting notifications, which clears it).
  }, [pathname]);

  return (
    <aside className="pm-hq-sidebar fixed bottom-3 left-3 top-3 z-40 hidden w-[80px] flex-col overflow-hidden rounded-[26px] border border-emerald-300/14 bg-[linear-gradient(180deg,rgba(4,16,10,0.96),rgba(2,9,6,0.9))] text-white shadow-[0_24px_60px_rgba(0,0,0,0.55),inset_0_0_30px_rgba(16,185,129,0.08)] backdrop-blur-2xl xl:flex">
      <div className="flex h-full flex-col items-center gap-3 px-2 py-3">
        <Link
          href="/"
          className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-white"
          aria-label="PlayGame-ზე დაბრუნება"
          title="PlayGame"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <nav className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const base = item.href.split('?')[0];
            const active = base === '/playmanager' ? pathname === '/playmanager' : pathname === base || pathname?.startsWith(`${base}/`);

            const showBadge = item.href === '/playmanager/notifications' && unread > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => playNavSound(item.href)}
                title={showBadge ? `${item.label} · ${unread} ახალი` : item.label}
                className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-center text-[9px] font-black uppercase leading-tight transition ${
                  active
                    ? 'border-emerald-300/45 bg-emerald-300/15 text-emerald-50 shadow-[0_0_24px_rgba(16,185,129,0.22)]'
                    : 'border-white/10 bg-white/[0.04] text-white/62 hover:border-emerald-300/25 hover:bg-emerald-300/10 hover:text-white'
                }`}
              >
                {showBadge ? (
                  <span className="absolute right-1.5 top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-emerald-400 px-1 text-[8px] font-black text-black shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
                <Icon className="h-4 w-4 flex-none" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
