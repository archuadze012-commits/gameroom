## 2024-05-24 - Open Redirect via Protocol-Relative URLs in Auth Callbacks
**Vulnerability:** The OAuth callback routes (`src/app/auth/callback/route.ts` and `src/app/auth/google/route.ts`) verified that the `next` parameter started with `/` to ensure a local redirect. However, this check alone does not prevent protocol-relative URLs (e.g., `//malicious.com`), allowing Open Redirect attacks.
**Learning:** Using `startsWith("/")` is a common but incomplete way to validate relative redirect paths in Next.js applications. Protocol-relative URLs bypass this simple check.
**Prevention:** Always combine `startsWith("/")` with explicit negative checks for protocol-relative formats: `next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")`.
