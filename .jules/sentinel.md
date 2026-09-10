## 2026-07-13 - Prevent Open Redirect via Protocol-Relative URLs
**Vulnerability:** Open redirect vulnerability in authentication callbacks (auth/callback, auth/google) because URL validation only checked `startsWith("/")`.
**Learning:** Checking for a leading slash is insufficient for relative URL validation, as protocol-relative URLs (`//malicious.com`) and their variants (`/\malicious.com`) bypass this check and can trick the browser into redirecting to an external site.
**Prevention:** Explicitly reject protocol-relative URLs by ensuring `!url.startsWith("//") && !url.startsWith("/\")` in addition to the `startsWith("/")` check when validating redirect URLs.
