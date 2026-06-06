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
import { hasPermission } from "@/lib/admin";
import { EditModeProvider } from "@/components/admin/edit-mode-context";
import { GlobalBackground } from "@/components/layout/global-background";

const firaGO = localFont({
  src: [
    { path: "./fonts/firago/FiraGO-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/firago/FiraGO-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-firago",
  display: "swap",
  preload: true,
});

const alkSanet = localFont({
  src: "./fonts/alk-sanet.ttf",
  variable: "--font-alk-sanet",
  display: "swap",
  preload: true,
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  after(() => updateLastSeen());
  const user = await getSession().catch(() => null);
  const canEdit = user ? await hasPermission("manage_content").catch(() => false) : false;

  return (
    <html
      lang="ka"
      data-scroll-behavior="smooth"
      className={`dark ${firaGO.variable} ${alkSanet.variable} antialiased`}
    >
      <body suppressHydrationWarning className="bg-transparent text-foreground">
        <EditModeProvider canEdit={canEdit}>
          <GlobalBackground />
          <div className="relative flex flex-col w-full max-w-[100vw] overflow-x-clip min-h-[100dvh]">
            <SiteHeader />
            <main className="flex-1 pt-20 pb-6 landscape:pt-0 landscape:pb-0 sm:pt-0 sm:pb-0">{children}</main>
            <SiteFooter />
            <ClientChrome isAuthenticated={!!user} canEdit={canEdit} />
            <Toaster richColors position="top-right" />
          </div>
        </EditModeProvider>
      </body>
    </html>
  );
}
