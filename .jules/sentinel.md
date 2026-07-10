## 2026-07-10 - Fix Open Redirect in Auth Next Params
**Vulnerability:** Open Redirect via protocol-relative URLs (e.g. `//evil.com`) in `next` query parameter during auth callbacks.
**Learning:** Checking for a leading slash (`startsWith("/")`) is insufficient for validating relative redirect URLs, as it allows protocol-relative URLs which the browser treats as cross-origin redirects.
**Prevention:** Explicitly reject protocol-relative URLs (`//` and `/\`) by verifying `!next.startsWith("//") && !next.startsWith("/\")`.
