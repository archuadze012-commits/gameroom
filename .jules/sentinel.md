## 2025-02-17 - Prevent Open Redirect Vulnerabilities
**Vulnerability:** Open redirect allowing protocol-relative URLs (`//example.com`) to bypass the `startsWith("/")` check.
**Learning:** Checking for a leading slash is not sufficient for URL validation because browsers interpret `//` or `/\` as protocol-relative URLs, leading to unintended external redirects.
**Prevention:** Explicitly reject protocol-relative URLs by ensuring `!next.startsWith("//") && !next.startsWith("/\\")` when validating relative paths.
