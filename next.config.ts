import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for hydration; unsafe-eval for dev HMR (removed in prod builds but kept for safety)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' blob: *.supabase.co wss://*.supabase.co *.livekit.cloud wss://*.livekit.cloud api.groq.com api.open-meteo.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob: *.supabase.co",
  "font-src 'self' data:",
  "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://www.tiktok.com https://player.twitch.tv",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
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
        source: "/(.*)",
        headers: securityHeaders,
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
    ],
  },
};

export default nextConfig;
