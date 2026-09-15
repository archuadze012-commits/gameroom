import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// unsafe-eval is ONLY needed in development (React's error overlay evals to
// reconstruct server stacks). Per the Next.js CSP guide it is NOT required in
// production — neither React nor Next.js eval at runtime there — so drop it from
// the prod policy. unsafe-inline stays: Next's hydration/bootstrap emits inline
// scripts+styles, and a nonce-based CSP would force EVERY page into dynamic
// rendering (no static/ISR/CDN caching) — not worth it for a content site.
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' blob: *.supabase.co wss://*.supabase.co api.groq.com api.open-meteo.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob: *.supabase.co",
  "font-src 'self' data:",
  "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://www.tiktok.com https://player.twitch.tv",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  distDir: ".next",
  devIndicators: false,
  serverExternalPackages: ["discord.js"],
  // Strip console.* (except errors) from the production client bundle:
  // smaller JS, no runtime logging cost, no accidental log leakage.
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex" }
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "images.contentstack.io",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.uefa.com",
      },
      {
        protocol: "https",
        hostname: "cdn.sofifa.net",
      },
      // Game cover / hero art is admin-entered and lives on arbitrary CDNs
      // (gamewallpapers.com, gaming-cdn.com, wallpapers.com, …). A wildcard
      // lets those render through the optimizer (resized WebP instead of raw
      // 400KB source JPGs) without a runtime crash whenever a new host shows
      // up in content.
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

// withSentryConfig no-ops safely if SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN
// aren't set (source-map upload is just skipped at build time) — safe to ship
// before Sentry is fully configured.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  // Route browser SDK traffic through our own domain (/monitoring) instead of
  // calling *.sentry.io directly — avoids ad-blockers dropping events and means
  // the CSP connect-src doesn't need a sentry.io entry at all.
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
  // Bundler-agnostic tree-shaking (works under Turbopack too, unlike the
  // webpack.treeshake option): strip debug code and the tracing integration
  // from the client bundle — the client is errors-only (no tracesSampleRate).
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
  },
  webpack: {
    automaticVercelMonitors: false,
    treeshake: { removeDebugLogging: true },
  },
});
