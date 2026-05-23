import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono, Noto_Sans_Georgian } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { after } from "next/server";
import { updateLastSeen } from "@/lib/update-last-seen";
import { ChatbotWidget } from "@/components/chatbot-widget";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PWAInstallFloater } from "@/components/pwa-install-floater";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const notoGeorgian = Noto_Sans_Georgian({
  variable: "--font-noto-georgian",
  subsets: ["georgian"],
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
      className={`dark ${inter.variable} ${interTight.variable} ${jetbrainsMono.variable} ${notoGeorgian.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">
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
