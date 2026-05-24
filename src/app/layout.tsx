import type { Metadata } from "next";
import localFont from "next/font/local";
import dynamic from "next/dynamic";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { after } from "next/server";
import { updateLastSeen } from "@/lib/update-last-seen";

const ChatbotWidget = dynamic(() =>
  import("@/components/chatbot-widget").then((m) => m.ChatbotWidget)
);
const MobileBottomNav = dynamic(() =>
  import("@/components/layout/mobile-bottom-nav").then((m) => m.MobileBottomNav)
);
const PWAInstallFloater = dynamic(() =>
  import("@/components/pwa-install-floater").then((m) => m.PWAInstallFloater)
);

const firaGO = localFont({
  src: [
    { path: "./fonts/firago/FiraGO-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/firago/FiraGO-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/firago/FiraGO-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/firago/FiraGO-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/firago/FiraGO-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-firago",
  display: "swap",
});

const alkSanet = localFont({
  src: "./fonts/alk-sanet.ttf",
  variable: "--font-alk-sanet",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Gameroom — ქართველი გეიმერების სახლი",
    template: "%s · Gameroom",
  },
  description:
    "იპოვე გუნდი, შეუერთდი ჩემპიონატებს და განიხილე საყვარელი თამაშები — eFootball, FIFA Mobile, PUBG, Warzone.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Gameroom",
    description: "ქართველი გეიმერების სათემო პლატფორმა.",
    locale: "ka_GE",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  after(() => updateLastSeen());
  return (
    <html
      lang="ka"
      className={`dark ${firaGO.variable} ${alkSanet.variable} h-full antialiased scroll-smooth`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1 pb-16 xl:pb-0">{children}</main>
        <SiteFooter />
        <ChatbotWidget />
        <MobileBottomNav />
        <PWAInstallFloater delay={15000} locale="ka" />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
