## 2026-07-25 - Insecure CSRF State Token in TikTok OAuth
**Vulnerability:** The TikTok OAuth initialization endpoint (`src/app/api/auth/tiktok/start/route.ts`) generated the CSRF state token using `Math.random()`, which is a pseudo-random number generator and not cryptographically secure.
**Learning:** Relying on `Math.random()` for security-sensitive tokens can allow attackers to predict the state value, potentially leading to CSRF attacks where an attacker's identity could be linked to a victim's account.
**Prevention:** Always use cryptographically secure random number generators like `node:crypto`'s `randomBytes(16).toString('hex')` or `crypto.randomUUID()` for generating nonces, state tokens, or other security-sensitive values.
