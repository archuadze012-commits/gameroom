## 2025-02-24 - [Open Redirect via Protocol-Relative URLs]
**Vulnerability:** The application was susceptible to open redirect vulnerabilities in `src/app/auth/callback/route.ts` and `src/app/auth/google/route.ts`. The validation for the `next` query parameter only checked if the URL started with a slash (`next.startsWith("/")`).
**Learning:** Checking for a leading slash is insufficient. An attacker could supply a protocol-relative URL, such as `//malicious.com`, which bypasses the `startsWith("/")` check but causes the browser to redirect to the malicious domain.
**Prevention:** Explicitly reject protocol-relative URLs by ensuring the URL does not start with `//` or `/\`. A more robust check is: `next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")`.
