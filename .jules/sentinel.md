## 2024-05-24 - [Open Redirect in Auth Callbacks]
**Vulnerability:** The application validated the `next` redirect parameter using `next.startsWith("/")`, which fails to prevent protocol-relative redirects (e.g., `//malicious.com`).
**Learning:** `startsWith("/")` is an insufficient check for local paths because browsers treat `//` or `/\` as protocol-agnostic external navigation.
**Prevention:** Always validate relative paths by explicitly excluding double slashes: `path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")`.
