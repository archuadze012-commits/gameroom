## 2024-03-24 - Fix Open Redirect in Auth Routes
**Vulnerability:** Open Redirect
**Learning:** Checking for a leading slash (`startsWith("/")`) is insufficient for validating relative redirect URLs. An attacker can supply protocol-relative URLs like `//attacker.com` which evaluates to true and can redirect users to a malicious site.
**Prevention:** Explicitly reject protocol-relative URLs by adding `&& !next.startsWith("//") && !next.startsWith("/\\")` alongside the initial slash check.
