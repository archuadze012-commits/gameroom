## 2024-03-05 - Insecure CSRF Token Generation
**Vulnerability:** The OAuth `state` parameter in the TikTok authentication flow (`src/app/api/auth/tiktok/start/route.ts`) was being generated using `Math.random().toString(36)`.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, making the OAuth CSRF tokens predictable. Other flows (like Steam) correctly used `node:crypto`'s `randomBytes`.
**Prevention:** Always use cryptographically secure random generation (`node:crypto`'s `randomBytes` or `crypto.randomUUID()`) for security-sensitive tokens, nonces, and session states. Do not use `Math.random()` for anything security-related.
