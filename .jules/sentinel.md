## 2025-03-05 - Fix Insecure CSRF Token Generation
**Vulnerability:** Weak PRNG used for OAuth state/CSRF token generation (`Math.random()`) in `src/app/api/auth/tiktok/start/route.ts`.
**Learning:** `Math.random()` is not cryptographically secure and predictable, which could allow attackers to bypass CSRF protection for OAuth flows.
**Prevention:** Always use `crypto.randomUUID()` or `node:crypto`'s `randomBytes` for generating security-sensitive values like CSRF tokens and session IDs.
