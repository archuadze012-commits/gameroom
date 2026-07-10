"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { MobileTopNav } from "@/components/layout/mobile-top-nav";

const WebViewSideNav = dynamic(() =>
  import("@/components/layout/webview-side-nav").then((m) => m.WebViewSideNav),
  { ssr: false },
);

export function ClientChrome({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const pathname = usePathname();
  const isPlayManager = pathname?.startsWith("/playmanager");
  const isLobby = pathname?.endsWith("/lobby");
  const isConversation = /^\/messages\/[^/]+$/.test(pathname ?? "");
  const showRightSideNav = false;

  useEffect(() => {
    document.documentElement.classList.toggle("gr-has-webview-side-nav", showRightSideNav);
    return () => {
      document.documentElement.classList.remove("gr-has-webview-side-nav");
    };
  }, [showRightSideNav]);

  useEffect(() => {
    document.documentElement.classList.toggle("gr-route-conversation", isConversation);
    document.body.classList.toggle("no-bottom-nav", isConversation);
    return () => {
      document.documentElement.classList.remove("gr-route-conversation");
      document.body.classList.remove("no-bottom-nav");
    };
  }, [isConversation]);

  if (isPlayManager || isLobby || isConversation) return null;

  return (
    <>
      {isAuthenticated && (showRightSideNav ? <WebViewSideNav /> : <MobileTopNav />)}
    </>
  );
}
