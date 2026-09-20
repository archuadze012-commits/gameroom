## 2024-05-24 - [Insecure CSRF Token Generation]
**Vulnerability:** Weak random number generation using `Math.random()` for TikTok OAuth CSRF state token in `src/app/api/auth/tiktok/start/route.ts`.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, allowing potential prediction of CSRF tokens.
**Prevention:** Use cryptographically secure random number generators (e.g., `crypto.randomUUID()` or `node:crypto.randomBytes()`) for generating security-sensitive values like CSRF tokens.
