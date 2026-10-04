## 2025-03-09 - Insecure CSRF State Token Generation
**Vulnerability:** In `src/app/api/auth/tiktok/start/route.ts`, the CSRF `state` parameter was being generated using `Math.random().toString(36).substring(2, 15)`. `Math.random()` is a pseudo-random number generator and is not cryptographically secure, which could allow an attacker to predict state values.
**Learning:** `Math.random()` should never be used for security-sensitive operations such as generating state tokens, CSRF tokens, or passwords, because the underlying pseudo-random generator is predictable.
**Prevention:** Always use cryptographically secure random number generators for security-sensitive tokens, such as `crypto.randomUUID()` or Node.js's `crypto.randomBytes()`.
