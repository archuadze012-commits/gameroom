import type { Metadata } from "next";
import localFont from "next/font/local";
import { Orbitron } from "next/font/google";
import "./globals.css";
import { after } from "next/server";
import { updateLastSeen } from "@/lib/update-last-seen";
import { getSession } from "@/lib/auth";
import { EditModeProvider } from "@/components/admin/edit-mode-context";
import { AppRouteChrome } from "@/components/layout/app-route-chrome";

const ROOT_ADMIN_EMAILS = [
  "archuadze012@gmail.com",
  ...(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean),
];

const firaGO = localFont({
  src: [
    { path: "./fonts/firago/FiraGO-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/firago/FiraGO-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-firago",
  display: "swap",
  preload: true,
});

const alkSanet = localFont({
  src: "./fonts/alk-sanet.woff2",
  variable: "--font-alk-sanet",
  display: "swap",
  preload: true,
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "PLAYGAME.GE — ქართველი გეიმერების სახლი",
    template: "%s · PLAYGAME.GE",
  },
  description:
    "იპოვე გუნდი, შეუერთდი ჩემპიონატებს და განიხილე საყვარელი თამაშები — eFootball, FIFA Mobile, PUBG, Warzone.",
  manifest: "/manifest.json",
  openGraph: {
    title: "PLAYGAME.GE",
    description: "ქართველი გეიმერების სათემო პლატფორმა.",
    locale: "ka_GE",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSession().catch(() => null);
  if (user) {
    after(() => updateLastSeen(user.id));
  }
  const canEdit = !!user?.email && ROOT_ADMIN_EMAILS.includes(user.email);

  return (
    <html
      lang="ka"
      data-scroll-behavior="smooth"
      className={`dark ${firaGO.variable} ${alkSanet.variable} ${orbitron.variable} antialiased`}
    >
      <body suppressHydrationWarning className="bg-transparent text-foreground">
        <EditModeProvider canEdit={canEdit}>
          <AppRouteChrome isAuthenticated={!!user} canEdit={canEdit}>
            {children}
          </AppRouteChrome>
        </EditModeProvider>
      </body>
    </html>
  );
}
