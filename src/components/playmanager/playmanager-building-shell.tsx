'use client';

import type { ReactNode } from 'react';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { PlayManagerBottomNav } from '@/components/playmanager/playmanager-bottom-nav';

// ── Shared building-page scaffold ─────────────────────────────────────────────
// Office, residence and training rendered a byte-identical <main> + sidebar +
// centered gutter column + action-message banner + bottom nav. That scaffold now
// lives here once; each building supplies only its inner content as children.
// The xl:pl-[116px] gutter clears the fixed left sidebar (see globals.css).

export function PlayManagerBuildingShell({
  actionMessage,
  children,
}: {
  actionMessage: string | null;
  children: ReactNode;
}) {
  return (
    <main className="pm-office pm-feedskin pm-hq-shell min-h-screen overflow-x-hidden bg-background pb-24 text-white xl:pb-0 xl:pl-[116px]">
      <PlayManagerSidebar />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1160px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        {actionMessage ? (
          <div className="mb-3 rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.08] px-4 py-2.5 text-xs font-black text-emerald-100">
            {actionMessage}
          </div>
        ) : null}
        {children}
      </div>
      <PlayManagerBottomNav />
    </main>
  );
}
