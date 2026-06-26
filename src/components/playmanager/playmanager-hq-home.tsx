'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ComponentType } from 'react';
import {
  Building2,
  Dumbbell,
  Landmark,
  Megaphone,
  MessageCircle,
  Search,
  Shield,
  ShoppingCart,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { PlayManagerIsoCity } from '@/components/playmanager/playmanager-iso-city';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';

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
  { label: 'მარკეტი', icon: ShoppingCart, href: '/playmanager/market' },
  { label: 'ოფისი', icon: Landmark, href: '/playmanager/finance' },
  { label: 'ძებნა', icon: Search, href: '/playmanager/search' },
  { label: 'მესენჯერი', icon: MessageCircle, href: '/playmanager/messages' },
  { label: 'უწყებები', icon: Megaphone, href: '/playmanager/announcements' },
];

export function PlayManagerHqHome() {
  return (
    <main className="pm-hq-home relative h-[100dvh] overflow-hidden bg-[#050706] text-white">
      <PlayManagerSidebar />
      <div className="absolute inset-0 pl-0 xl:pl-[92px]">
        <PlayManagerIsoCity />
      </div>
      <MobileNav />
    </main>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const items = navItems.slice(0, 6);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-1 rounded-2xl border border-emerald-300/14 bg-[linear-gradient(180deg,rgba(4,16,10,0.96),rgba(2,9,6,0.9))] px-2 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_0_24px_rgba(16,185,129,0.08)] backdrop-blur-2xl xl:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const base = item.href.split('?')[0];
        const active = base === '/playmanager' ? pathname === '/playmanager' : pathname === base || pathname?.startsWith(`${base}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            title={item.label}
            className={`grid h-11 flex-1 place-items-center rounded-xl border transition ${
              active
                ? 'border-emerald-300/45 bg-emerald-300/15 text-emerald-50'
                : 'border-transparent text-white/62 hover:bg-emerald-300/10 hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5" />
          </Link>
        );
      })}
    </nav>
  );
}
