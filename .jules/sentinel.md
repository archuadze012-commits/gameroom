## 2025-02-26 - Open Redirect bypass in relative redirect paths
**Vulnerability:** Open Redirect via protocol-relative URLs (`//evil.com` or `/\evil.com`) bypassing `startsWith("/")` checks.
**Learning:** Checking for a leading slash (`startsWith("/")`) is insufficient for validating relative redirect URLs, as it allows attackers to use protocol-relative URLs to redirect users to malicious domains.
**Prevention:** Explicitly reject protocol-relative URLs by verifying `startsWith("/") && !startsWith("//") && !startsWith("/\\")`.
