"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MobileTopNav } from "@/components/layout/mobile-top-nav";

const WebViewSideNav = dynamic(() =>
  import("@/components/layout/webview-side-nav").then((m) => m.WebViewSideNav),
  { ssr: false },
);

const AdminEditBar = dynamic(() =>
  import("@/components/admin/admin-edit-bar").then((m) => m.AdminEditBar),
  { ssr: false },
);

export function ClientChrome({ isAuthenticated = false, canEdit = false }: { isAuthenticated?: boolean; canEdit?: boolean }) {
  const pathname = usePathname();
  const isLobby = pathname?.endsWith("/lobby");
  const isConversation = /^\/messages\/[^/]+$/.test(pathname ?? "");
  const showAdminEditBar = canEdit && pathname !== "/";
  const showRightSideNav = false;

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
      {isAuthenticated && (showRightSideNav ? <WebViewSideNav canEdit={canEdit} /> : <MobileTopNav />)}
      {showAdminEditBar ? <AdminEditBar /> : null}
    </>
  );
}
