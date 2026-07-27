## 2025-03-01 - [Insecure CSRF Token Generation]
**Vulnerability:** Found `Math.random()` used to generate CSRF tokens for TikTok OAuth state parameter (`src/app/api/auth/tiktok/start/route.ts`).
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, making the OAuth flow susceptible to CSRF attacks if the token is guessed.
**Prevention:** Always use cryptographically secure random number generators like `crypto.randomUUID()` or `node:crypto`'s `randomBytes` for security-sensitive values.
