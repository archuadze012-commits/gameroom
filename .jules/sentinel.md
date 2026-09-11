## 2025-02-14 - Fix insecure randomness for OAuth CSRF token
**Vulnerability:** Weak PRNG (`Math.random()`) used for generating OAuth CSRF state parameters.
**Learning:** `Math.random()` was used to generate state tokens in `src/app/api/auth/tiktok/start/route.ts`, which makes the CSRF token predictable. The project uses Node 24.x, making `crypto.randomUUID()` available globally.
**Prevention:** Always use cryptographically secure random values (e.g., `crypto.randomUUID()` or `node:crypto`'s `randomBytes`) for security-sensitive tokens like CSRF state parameters, session IDs, and nonces.
