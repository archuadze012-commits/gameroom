## 2024-05-18 - Fix Open Redirect in Authentication

**Vulnerability:** Open Redirect via protocol-relative URLs (`//example.com` or `/\example.com`) in `next` search parameter. Even when checking `.startsWith("/")`, an attacker can bypass the check to redirect users to a malicious site.

**Learning:** The built-in URL parsing or simple `/` prefix check doesn't protect against protocol-relative URLs that use double slashes `//` or a combination `/\`. This is a common pattern for Open Redirects.

**Prevention:** To validate relative redirect URLs, checking for a leading slash (`startsWith("/")`) is insufficient. Explicitly reject protocol-relative URLs (`//` and `/\`) by verifying `!next.startsWith("//") && !next.startsWith("/\\")` to prevent Open Redirect vulnerabilities.
