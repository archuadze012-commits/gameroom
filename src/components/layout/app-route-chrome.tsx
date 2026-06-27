'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/sonner';

const SiteHeader = dynamic(
  () => import('@/components/layout/site-header').then((mod) => mod.SiteHeader),
  { ssr: false },
);
const SiteFooter = dynamic(
  () => import('@/components/layout/site-footer').then((mod) => mod.SiteFooter),
  { ssr: false },
);
const ClientChrome = dynamic(
  () => import('@/components/layout/client-chrome').then((mod) => mod.ClientChrome),
  { ssr: false },
);
const GlobalBackground = dynamic(
  () => import('@/components/layout/global-background').then((mod) => mod.GlobalBackground),
  { ssr: false },
);

export function AppRouteChrome({
  children,
  isAuthenticated,
  canEdit,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  canEdit: boolean;
}) {
  const pathname = usePathname();
  const hasResolvedPath = Boolean(pathname);
  const isPlayManager = pathname?.startsWith('/playmanager');
  const showGlobalChrome = hasResolvedPath && !isPlayManager;

  return (
    <>
      {showGlobalChrome ? <GlobalBackground /> : null}
      <div className="relative flex min-h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-clip">
        {showGlobalChrome ? <SiteHeader /> : null}
        <main className={`flex-1 ${isPlayManager ? '' : 'pt-16 pb-6 sm:pt-16 landscape:pb-0'}`}>{children}</main>
        {showGlobalChrome ? <SiteFooter /> : null}
        {showGlobalChrome ? <ClientChrome isAuthenticated={isAuthenticated} canEdit={canEdit} /> : null}
        <Toaster richColors position="top-right" />
      </div>
    </>
  );
}
