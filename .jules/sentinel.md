## 2025-03-05 - [Open Redirect Bypass Fix]
**Vulnerability:** Weak path validation in authentication redirects allowed Open Redirect.
**Learning:** Checking `url.startsWith("/")` is insufficient, as it allows protocol-relative URLs (e.g. `//malicious.com`).
**Prevention:** Always validate relative URLs by strictly rejecting `//` and `/\\\.

\n## 2025-03-05 - [Deployment Config & Grant Fixes]
**Vulnerability:** CI/CD Build Failures and Database Schema Grant Mismatch
**Learning:**
1. Next.js/Vercel edge functions on Cloudflare Pages fail when using regex capture groups in Next.js config routing `source` fields; glob syntax `/:path*` must be used.
2. The custom schema auditor (`test:profile-grants`) rigidly checks that any column written to by the application has an explicit `UPDATE` grant for the `authenticated` role in the database migrations.
**Prevention:** Always use glob path matching (`/:path*`) for Next.js headers/redirects. When adding new profile fields mutated directly by users (like `looking_for_clan`), ensure a corresponding migration adds both the column and the required `GRANT UPDATE... TO authenticated;`.

\n## 2025-03-05 - [React State Updates & ESLint Fixes]
**Vulnerability:** Application instability and React Hydration / Render Cycle errors causing CI pipeline to fail.
**Learning:** React `useEffect` with synchronous state updates or impure function calls (`Date.now()`) during render violates React's strict purity and hook rules, causing build-time ESLint errors (`react-hooks/set-state-in-effect`, `react-hooks/purity`). Unescaped quotes (`"`) in JSX text nodes cause parser errors.
**Prevention:** Wrap `setState` calls inside `useEffect` with `setTimeout(..., 0)` to safely push updates to the end of the event loop. Always initialize time-based state (e.g., `Date.now()`) via `useEffect` instead of calling it directly during render. Escape quotes in JSX using HTML entities like `&quot;`.

\n## 2025-03-05 - [Build Instability from Missing Env Vars]
**Vulnerability:** Next.js `build` (static generation phase) crashing in CI pipelines because required environment variables are missing on the build server.
**Learning:** During the `next build` step, Next.js executes page logic to statically render pages (e.g., `/free-pc-games`, `/sitemap.xml`). If a page instantiates the Supabase client without handling cases where the env vars (`NEXT_PUBLIC_SUPABASE_URL`, etc.) are missing, the build process crashes and the CI pipeline fails.
**Prevention:** For UI pages that fetch data on the server, gracefully handle missing Supabase env vars with an early return (e.g., `if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;`). For completely anonymous, server-side data generation like sitemaps, providing a fallback URL string (e.g. `?? "https://placeholder.supabase.co"`) satisfies the Supabase SDK constructor and allows the static generation to safely yield empty data and complete the build step without crashing.
