## 2024-07-01 - Prevent Open Redirect Vulnerabilities
**Vulnerability:** Open redirect in `next` redirect query parameters where a leading slash check (`startsWith("/")`) was insufficient to prevent protocol-relative URLs (`//` or `/\`).
**Learning:** `next.startsWith("/")` still allows URLs like `//malicious.site.com` or `/\malicious.site.com`, which browsers treat as protocol-relative absolute URLs.
**Prevention:** Always explicitly reject protocol-relative URLs when validating relative redirect URLs, by verifying `!next.startsWith("//") && !next.startsWith("/\\")`.