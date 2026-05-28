import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { after } from "next/server";
import { updateLastSeen } from "@/lib/update-last-seen";
import { ClientChrome } from "@/components/layout/client-chrome";
import { getSession } from "@/lib/auth";

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
  const user = await getSession().catch(() => null);

  return (
    <html
      lang="ka"
      className={`dark ${firaGO.variable} ${alkSanet.variable} h-full antialiased scroll-smooth`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1 pb-16 xl:pb-0">{children}</main>
        <SiteFooter />
        <ClientChrome isAuthenticated={!!user} />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
