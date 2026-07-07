## 2024-03-24 - Open Redirect in Next.js Auth Handlers
**Vulnerability:** Open Redirect
**Learning:** Using `next.startsWith("/")` to validate internal redirects is insufficient because it allows protocol-relative URLs like `//example.com` or `/\example.com`, enabling attackers to redirect users to malicious sites after authentication.
**Prevention:** Always validate relative redirects explicitly by rejecting protocol-relative URLs. A safer check is `next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")`.
