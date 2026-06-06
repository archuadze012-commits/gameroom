"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MobileTopNav } from "@/components/layout/mobile-top-nav";

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

export function ClientChrome({ canEdit = false }: { isAuthenticated?: boolean; canEdit?: boolean }) {
  const pathname = usePathname();
  const isLobby = pathname?.endsWith("/lobby");
  const isConversation = /^\/messages\/[^/]+$/.test(pathname ?? "");
  const showAdminEditBar = canEdit && pathname !== "/";
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const showRightSideNav = false;

  useEffect(() => {
    const pwaId = window.setTimeout(() => setShowPwaPrompt(true), 15_000);
    return () => window.clearTimeout(pwaId);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("gr-has-webview-side-nav", showRightSideNav);
    return () => {
      document.documentElement.classList.remove("gr-has-webview-side-nav");
    };
  }, [showRightSideNav]);

  useEffect(() => {
    document.documentElement.classList.toggle("gr-route-conversation", isConversation);
    return () => {
      document.documentElement.classList.remove("gr-route-conversation");
    };
  }, [isConversation]);

  if (isLobby || isConversation) return null;

  return (
    <>
      {showRightSideNav ? <WebViewSideNav canEdit={canEdit} /> : <MobileTopNav />}
      {showPwaPrompt ? <PWAInstallFloater delay={0} locale="ka" /> : null}
      {showAdminEditBar ? <AdminEditBar /> : null}
    </>
  );
}
