## 2025-03-05 - [Open Redirect Bypass Fix]
**Vulnerability:** Weak path validation in authentication redirects allowed Open Redirect.
**Learning:** Checking `url.startsWith("/")` is insufficient, as it allows protocol-relative URLs (e.g. `//malicious.com`).
**Prevention:** Always validate relative URLs by strictly rejecting `//` and `/\\\.
