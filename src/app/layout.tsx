import type { Metadata } from "next";
import localFont from "next/font/local";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { AppRouteChrome } from "@/components/layout/app-route-chrome";
import { getSiteUrl } from "@/lib/url";

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

// Self-hosted (was next/font/google) so production builds never depend on a
// build-time fetch to Google Fonts. Weights 700/800/900, latin subset.
const orbitron = localFont({
  src: [
    { path: "./fonts/orbitron/Orbitron-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/orbitron/Orbitron-ExtraBold.woff2", weight: "800", style: "normal" },
    { path: "./fonts/orbitron/Orbitron-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-orbitron",
  display: "swap",
});

export const metadata: Metadata = {
  // Without metadataBase, every relative OG/Twitter image (here and in per-page
  // generateMetadata) resolves to a broken URL in production. Next warns about
  // exactly this. Set it from the canonical site origin.
  metadataBase: new URL(getSiteUrl()),
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
    siteName: "PLAYGAME.GE",
    url: "/",
    locale: "ka_GE",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "PLAYGAME.GE" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PLAYGAME.GE",
    description: "ქართველი გეიმერების სათემო პლატფორმა.",
    images: ["/logo.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // iOS Safari auto-zooms the page when a focused input renders below 16px,
  // which on fixed-height views (chat) clips the right edge and spawns both
  // scrollbars. maximumScale disables that focus-zoom; Apple still honors
  // user pinch-zoom regardless of this value, so accessibility is intact.
  maximumScale: 1,
};

// No getSession()/cookies() here — this layout stays statically renderable so
// individual routes can be static/ISR (and client navigation to them is
// prefetched, not a server round-trip). Auth for the chrome is read client-side
// inside AppRouteChrome via /api/me.
// SpeedInsights fetches /_vercel/speed-insights/script.js, a route Vercel's
// edge injects at runtime — it 404s (and spams the console) on any host that
// isn't actually Vercel, including localhost. VERCEL is set by Vercel itself
// in every one of its environments, so this only renders where the script
// can actually load.
const isOnVercel = Boolean(process.env.VERCEL);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ka"
      data-scroll-behavior="smooth"
      className={`dark ${firaGO.variable} ${alkSanet.variable} ${orbitron.variable} antialiased`}
    >
      <body suppressHydrationWarning className="bg-transparent text-foreground">
        <AppRouteChrome>{children}</AppRouteChrome>
        {isOnVercel ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
