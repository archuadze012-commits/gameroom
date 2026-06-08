## 2023-10-27 - Netlify Next.js Header Rules
**Learning:** Netlify deployments fail with "Header rules" or "Redirect rules" errors when the `source` property uses regex capture groups (e.g., `/(.*)`) instead of Next.js glob path matching syntax (e.g., `/:path*`).
**Action:** Always use Next.js glob syntax (`/:path*`) for routing header rules in `next.config.ts` and `vercel.json` when deploying to Netlify, as it relies on `path-to-regexp` v8.
