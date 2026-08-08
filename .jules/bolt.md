## 2024-05-16 - Vercel Next.js Deployment CI Failures
**Learning:** Migrating routing headers from `vercel.json` to `next.config.ts` using glob syntax `/:path*` prevents deployment errors associated with Next.js regex matching and capture groups `/(.*)` on cloud services like Netlify and Cloudflare.
**Action:** When working on Next.js deployment headers, configure them natively in `next.config.ts` with Next.js path matching to avoid environment-specific parse errors, and ensure related unit tests check for both the new and old formats.
