'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/sonner';
import { useMe } from '@/components/layout/use-me';

// SSR'd (unlike the other chrome below): this renders the header logo, which
// is the page's LCP element. useMe()/useNavProfile() start from a safe
// deterministic default ({authenticated:false}/null) on both server and first
// client render, so SSR-ing this introduces no hydration mismatch — it just
// gets the logo into the initial HTML instead of behind a client-only mount.
const SiteHeader = dynamic(
  () => import('@/components/layout/site-header').then((mod) => mod.SiteHeader),
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

export function AppRouteChrome({ children }: { children: React.ReactNode }) {
  // Auth is read CLIENT-SIDE here (not in the root layout) so the layout — and
  // therefore every route — is no longer forced into dynamic rendering.
  const { authenticated, resolved } = useMe();
  const pathname = usePathname();
  const hasResolvedPath = Boolean(pathname);
  const isPlayManager = pathname?.startsWith('/playmanager');
  const showGlobalChrome = hasResolvedPath && !isPlayManager;
  // The animated storm background is reserved for the unauthorized (guest) home
  // page; every other route shows just a static dark backdrop. Gate on `resolved`
  // so an authed user on `/` never sees a storm flash before the session read
  // completes (authenticated starts false); a real guest still gets it as soon as
  // the near-instant local session read resolves.
  const isGuestHome = pathname === '/' && resolved && !authenticated;

  return (
    <>
      {showGlobalChrome ? <GlobalBackground storm={isGuestHome} /> : null}
      <div className="relative flex min-h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-clip">
        {showGlobalChrome ? <SiteHeader /> : null}
        <main className={`flex-1 ${isPlayManager ? '' : 'pt-16 pb-6 sm:pt-16 landscape:pb-0'}`}>{children}</main>
        {showGlobalChrome ? <SiteFooter /> : null}
        {showGlobalChrome ? <ClientChrome isAuthenticated={authenticated} /> : null}
        <Toaster richColors position="top-right" />
      </div>
    </>
  );
}
