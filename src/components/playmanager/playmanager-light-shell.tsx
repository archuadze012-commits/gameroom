'use client';

import { useRouter } from 'next/navigation';
import { Home, Megaphone, Menu, MessageSquareMore, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Dock } from '@/components/react-bits/dock';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';

const dockNav = [
  { label: 'მთავარი', icon: Home, href: '/playmanager' },
  { label: 'ძებნა', icon: Search, href: '/playmanager/search' },
  { label: 'მესენჯერი', icon: MessageSquareMore, href: '/playmanager/messages' },
  { label: 'უწყებები', icon: Megaphone, href: '/playmanager/announcements' },
  { label: 'მეტი', icon: Menu, href: '/playmanager/office' },
];

export function PlayManagerLightShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <main className="pm-hq-home pm-hq-shell min-h-screen overflow-x-hidden bg-[#020604] pb-24 text-white xl:pb-0 xl:pl-[100px]">
      <PlayManagerSidebar />
      <div className="relative mx-auto w-full max-w-[1160px] px-4 py-4 sm:px-6 lg:px-8 xl:mx-0 xl:max-w-[min(1360px,calc(100vw-120px))]">{children}</div>
      <Dock
        items={dockNav.map((item, index) => {
          const Icon = item.icon;
          return {
            label: item.label,
            icon: <Icon className="h-5 w-5" />,
            onClick: () => router.push(item.href),
            className: index === 0 ? 'bg-emerald-300/16 text-emerald-100' : 'text-white/62',
          };
        })}
      />
    </main>
  );
}
