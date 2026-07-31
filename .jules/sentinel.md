## 2024-07-31 - Insecure CSRF Token Generation
**Vulnerability:** Pseudo-random number generator (`Math.random()`) was used to generate an OAuth CSRF state token in `src/app/api/auth/tiktok/start/route.ts`.
**Learning:** `Math.random()` is not cryptographically secure and predictable, which could allow attackers to guess the CSRF state token and bypass CSRF protection.
**Prevention:** Always use a cryptographically secure random number generator (CSPRNG) like `crypto.randomUUID()` or `crypto.randomBytes()` when generating tokens, passwords, or other security-sensitive values.