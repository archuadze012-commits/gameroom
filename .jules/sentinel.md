## 2026-08-01 - Insecure CSRF Token Generation
**Vulnerability:** Weak PRNG `Math.random()` was being used to generate OAuth CSRF state tokens in the TikTok authentication route (`src/app/api/auth/tiktok/start/route.ts`).
**Learning:** `Math.random()` is not cryptographically secure, and relying on it for security controls (such as CSRF tokens or session identifiers) exposes the system to token prediction attacks.
**Prevention:** Always use cryptographically secure random number generators like `crypto.randomUUID()` (in modern Node/Browser environments) or `node:crypto.randomBytes` when generating security-sensitive values.
