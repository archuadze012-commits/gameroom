## 2026-07-06 - [Open Redirect via Protocol-Relative URLs]
**Vulnerability:** The application was using `next.startsWith("/")` to validate redirect URLs in the authentication flow. This allowed Open Redirect attacks using protocol-relative URLs (e.g., `//malicious.com`) or backslash bypasses (e.g., `/\malicious.com`).
**Learning:** Checking for just a leading slash is insufficient for safely validating relative redirect URLs in Next.js/JavaScript, as browsers will interpret `//` as a valid absolute URL without a protocol, navigating away from the application.
**Prevention:** Always validate relative redirects by ensuring they start with a single slash but do not start with two slashes or a slash followed by a backslash (`!url.startsWith("//") && !url.startsWith("/\\")`).
