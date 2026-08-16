## 2025-02-23 - [HIGH] Fix weak CSRF state generation in TikTok OAuth
**Vulnerability:** The TikTok OAuth start route (`src/app/api/auth/tiktok/start/route.ts`) was using `Math.random().toString(36).substring(2, 15)` to generate the CSRF `state` token. `Math.random()` is a pseudo-random number generator and is not cryptographically secure, which could allow an attacker to predict the state token and launch CSRF attacks.
**Learning:** `Math.random()` should never be used for security-sensitive values like CSRF tokens, session IDs, or passwords.
**Prevention:** Always use cryptographically secure random number generators like `crypto.randomUUID()` (available globally in modern Node/Edge environments) or `node:crypto`'s `randomBytes()` for any security-related random generation.
