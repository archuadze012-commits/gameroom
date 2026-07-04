'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Award,
  Bell,
  Building2,
  Crown,
  Dumbbell,
  Landmark,
  Menu,
  MessageCircle,
  Search,
  ShoppingCart,
  Trophy,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';

// Single PlayManager mobile bottom nav — copies the PlayGame nav structure
// (animated neon-rail rail, 4 tabs + "მეტი" sheet, badges, active underline)
// but recoloured to PlayManager's emerald identity. Replaces every prior
// per-shell react-bits <Dock> variant so the nav is consistent everywhere.

type Tab = { href: string; label: string; icon: LucideIcon; badge?: number };

const PRIMARY_TABS: Tab[] = [
  { href: '/playmanager', label: 'მთავარი', icon: Building2 },
  { href: '/playmanager/arena', label: 'მატჩი', icon: Trophy },
  { href: '/playmanager/residence', label: 'გუნდი', icon: UsersRound },
  { href: '/playmanager/market', label: 'მარკეტი', icon: ShoppingCart },
];

const MORE_LINKS: { href: string; label: string; icon: LucideIcon; badgeKey?: 'notifications' }[] = [
  { href: '/playmanager/training', label: 'საწვრთნელი', icon: Dumbbell },
  { href: '/playmanager/finance', label: 'ოფისი', icon: Landmark },
  { href: '/playmanager/leaderboard', label: 'რეიტინგი', icon: Crown },
  { href: '/playmanager/achievements', label: 'მიღწევები', icon: Award },
  { href: '/playmanager/notifications', label: 'შეტყობინება', icon: Bell, badgeKey: 'notifications' },
  { href: '/playmanager/search', label: 'ძებნა', icon: Search },
  { href: '/playmanager/messages', label: 'მესენჯერი', icon: MessageCircle },
];

export function PlayManagerBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

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
  }, [pathname]);

  // Close the sheet on navigation (deferred to avoid setState-in-effect).
  useEffect(() => {
    const id = window.setTimeout(() => setMoreOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (event: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(event.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  const isActive = (href: string) =>
    href === '/playmanager' ? pathname === '/playmanager' : pathname.startsWith(href);

  const activeCls =
    'bg-[linear-gradient(135deg,rgba(16,185,129,0.2),rgba(52,211,153,0.12))] text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)] shadow-[0_0_26px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/30 scale-105';
  const idleCls = 'text-white/75 hover:bg-white/[0.05] hover:text-emerald-300';

  return (
    <>
      {/* bottom rail */}
      <div className="fixed bottom-1 left-1 right-1 z-50 xl:hidden">
        <nav className="neon-rail grid w-full grid-cols-5 gap-1.5 rounded-[28px] bg-[linear-gradient(135deg,rgba(6,18,13,0.92),rgba(3,9,6,0.96))] p-2 shadow-[0_20px_54px_rgba(0,0,0,0.7),inset_0_0_26px_rgba(16,185,129,0.1)] backdrop-blur-2xl">
          {PRIMARY_TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[22px] text-[9px] font-black uppercase tracking-[0.09em] transition-all duration-300 ${active ? activeCls : idleCls}`}
              >
                <span className={`grid h-7 w-7 place-items-center rounded-2xl ${active ? 'text-emerald-300' : 'text-white/80'}`}>
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                </span>
                <span>{label}</span>
                {active && (
                  <span className="absolute -bottom-[2px] left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />
                )}
              </Link>
            );
          })}

          {/* მეტი */}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-label="მეტი მენიუს გახსნა"
            className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[22px] text-[9px] font-black uppercase tracking-[0.09em] transition-all duration-300 ${moreOpen ? activeCls : idleCls}`}
          >
            <span className="relative grid h-7 w-7 place-items-center rounded-2xl">
              {moreOpen ? <X className="h-5 w-5 text-emerald-300" /> : <Menu className="h-5 w-5" />}
              {!moreOpen && unread > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-emerald-300 bg-emerald-500 px-1 text-[9px] font-black text-black shadow-[0_0_12px_rgba(16,185,129,0.85)]">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </span>
            <span>მეტი</span>
          </button>
        </nav>
      </div>

      {/* "მეტი" sheet */}
      {moreOpen && (
        <div
          ref={sheetRef}
          className="fixed bottom-[5.75rem] left-3 right-3 z-50 overflow-hidden rounded-[30px] border border-emerald-400/25 bg-[linear-gradient(145deg,rgba(7,20,14,0.96),rgba(3,9,6,0.98))] shadow-[0_26px_76px_rgba(0,0,0,0.75),0_0_34px_rgba(16,185,129,0.15)] backdrop-blur-3xl xl:hidden"
        >
          <div className="grid grid-cols-3 gap-2 p-3">
            {MORE_LINKS.map(({ href, label, icon: Icon, badgeKey }) => {
              const active = isActive(href);
              const badge = badgeKey === 'notifications' ? unread : 0;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={`group relative flex min-h-20 flex-col items-center justify-center gap-2 rounded-3xl border px-2 py-3 text-center text-xs font-black shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-105 ${
                    active
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/[0.05] bg-white/[0.02] text-white/75 hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300'
                  }`}
                >
                  <span className="relative">
                    <Icon className={`h-5 w-5 transition-colors ${active ? 'text-emerald-300' : 'text-white/80 group-hover:text-emerald-300'}`} />
                    {badge > 0 && (
                      <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full border border-emerald-300 bg-emerald-500 px-1 text-[9px] font-black text-black shadow-[0_0_12px_rgba(16,185,129,0.85)]">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
