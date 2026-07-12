## 2025-02-14 - Prevent Open Redirect Via Protocol-Relative URLs
**Vulnerability:** Open Redirect vulnerability in authentication callback routes via `next` query parameter.
**Learning:** `startsWith("/")` is not sufficient to prevent external redirects, as protocol-relative URLs like `//evil.com` or `/\evil.com` start with a slash but navigate externally when appended to an origin.
**Prevention:** Explicitly reject protocol-relative patterns (`!next.startsWith("//") && !next.startsWith("/\\")`) alongside `startsWith("/")` when validating paths.
