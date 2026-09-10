## 2025-03-09 - [Fix Open Redirect vulnerability in auth routes]
**Vulnerability:** [The `next` query parameter in auth callback/google routes was only validated with `next.startsWith("/")`, allowing open redirect via protocol-relative URLs like `//evil.com` or `/\evil.com`]
**Learning:** [A leading slash is insufficient for relative URL validation, as it does not prevent protocol-relative redirects which modern browsers will resolve to external domains]
**Prevention:** [Explicitly reject protocol-relative URLs (`//` and `/\`) by checking `!next.startsWith("//") && !next.startsWith("/\\")`]
