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
