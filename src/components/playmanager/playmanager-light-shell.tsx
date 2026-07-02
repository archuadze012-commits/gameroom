'use client';

import type { ReactNode } from 'react';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { PlayManagerBottomNav } from '@/components/playmanager/playmanager-bottom-nav';

export function PlayManagerLightShell({ children }: { children: ReactNode }) {
  return (
    <main className="pm-hq-home pm-feedskin pm-hq-shell min-h-screen overflow-x-hidden bg-[#020604] pb-24 text-white xl:pb-0 xl:pl-[100px]">
      <PlayManagerSidebar />
      <div className="relative mx-auto w-full max-w-[1160px] px-4 py-4 sm:px-6 lg:px-8 xl:mx-0 xl:max-w-[min(1360px,calc(100vw-120px))]">{children}</div>
      <PlayManagerBottomNav />
    </main>
  );
}
