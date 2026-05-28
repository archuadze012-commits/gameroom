"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ChatbotWidget = dynamic(() =>
  import("@/components/chatbot-widget").then((m) => m.ChatbotWidget),
  { ssr: false },
);

const MobileBottomNav = dynamic(() =>
  import("@/components/layout/mobile-bottom-nav").then((m) => m.MobileBottomNav),
  { ssr: false },
);

const PWAInstallFloater = dynamic(() =>
  import("@/components/pwa-install-floater").then((m) => m.PWAInstallFloater),
  { ssr: false },
);

export function ClientChrome({ isAuthenticated }: { isAuthenticated?: boolean }) {
  const [showChatbot, setShowChatbot] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);

  useEffect(() => {
    const chatbotId = window.setTimeout(() => setShowChatbot(true), 500);
    const pwaId = window.setTimeout(() => setShowPwaPrompt(true), 15_000);

    return () => {
      window.clearTimeout(chatbotId);
      window.clearTimeout(pwaId);
    };
  }, []);

  return (
    <>
      <MobileBottomNav />
      {showChatbot && isAuthenticated ? <ChatbotWidget /> : null}
      {showPwaPrompt ? <PWAInstallFloater delay={0} locale="ka" /> : null}
    </>
  );
}
