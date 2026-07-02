'use client';

import { PlayManagerIsoCity } from '@/components/playmanager/playmanager-iso-city';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { PlayManagerBottomNav } from '@/components/playmanager/playmanager-bottom-nav';

export function PlayManagerHqHome() {
  return (
    <main className="pm-hq-home pm-feedskin relative h-[100dvh] overflow-hidden bg-[#050706] text-white">
      <PlayManagerSidebar />
      <div className="absolute inset-0 pl-0 xl:pl-[92px]">
        <PlayManagerIsoCity />
      </div>
      <PlayManagerBottomNav />
    </main>
  );
}
