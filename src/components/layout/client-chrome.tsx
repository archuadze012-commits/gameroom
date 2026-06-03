"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

const MobileBottomNav = dynamic(() =>
  import("@/components/layout/mobile-bottom-nav").then((m) => m.MobileBottomNav),
  { ssr: false },
);

const WebViewSideNav = dynamic(() =>
  import("@/components/layout/webview-side-nav").then((m) => m.WebViewSideNav),
  { ssr: false },
);

const PWAInstallFloater = dynamic(() =>
  import("@/components/pwa-install-floater").then((m) => m.PWAInstallFloater),
  { ssr: false },
);

const AdminEditBar = dynamic(() =>
  import("@/components/admin/admin-edit-bar").then((m) => m.AdminEditBar),
  { ssr: false },
);

function isWebViewUserAgent() {
  if (typeof window === "undefined") return false;
  return /(; wv\)|Electron|CEF|WebView|FBAN|FBAV|Instagram|Line\/|MicroMessenger)/i.test(
    window.navigator.userAgent,
  );
}

function useIsWebView() {
  return useSyncExternalStore(
    () => () => {},
    isWebViewUserAgent,
    () => false,
  );
}

export function ClientChrome({ canEdit = false }: { isAuthenticated?: boolean; canEdit?: boolean }) {
  const pathname = usePathname();
  const isLobby = pathname?.endsWith("/lobby");
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const isWebView = useIsWebView();
  const showRightSideNav = !isLobby && (isWebView || isDesktop);

  useEffect(() => {
    const viewportQuery = window.matchMedia("(min-width: 1024px)");
    const desktopInputQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncDesktop = () => {
      setIsDesktop(viewportQuery.matches || (desktopInputQuery.matches && window.screen.width >= 1024));
    };

    syncDesktop();

    const pwaId = window.setTimeout(() => setShowPwaPrompt(true), 15_000);

    viewportQuery.addEventListener("change", syncDesktop);
    desktopInputQuery.addEventListener("change", syncDesktop);
    window.addEventListener("resize", syncDesktop);

    return () => {
      window.clearTimeout(pwaId);
      viewportQuery.removeEventListener("change", syncDesktop);
      desktopInputQuery.removeEventListener("change", syncDesktop);
      window.removeEventListener("resize", syncDesktop);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("gr-has-webview-side-nav", showRightSideNav);
    return () => {
      document.documentElement.classList.remove("gr-has-webview-side-nav");
    };
  }, [showRightSideNav]);

  if (isLobby) return null;

  return (
    <>
      {showRightSideNav ? <WebViewSideNav canEdit={canEdit} /> : <MobileBottomNav />}
      {showPwaPrompt ? <PWAInstallFloater delay={0} locale="ka" /> : null}
      {canEdit ? <AdminEditBar /> : null}
    </>
  );
}
