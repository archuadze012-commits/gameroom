## 2025-02-14 - Prevent Open Redirect via protocol-relative URLs
**Vulnerability:** The application was vulnerable to Open Redirect in the authentication flow because the `next` redirect query parameter was only validated to start with `/`. This allowed protocol-relative URLs (e.g., `//evil.com`), which browsers interpret as external destinations, to bypass the check.
**Learning:** Checking `url.startsWith("/")` is insufficient for ensuring a URL is a local path because it also matches protocol-relative schemes.
**Prevention:** Always combine `startsWith("/")` with explicit exclusions for `//` and `/\` (`!url.startsWith("//") && !url.startsWith("/\\")`), or parse the URL and enforce that the hostname matches the application's domain.
