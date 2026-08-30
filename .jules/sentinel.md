## 2024-05-24 - [Insecure CSRF Token Generation]
**Vulnerability:** The TikTok OAuth initialization flow (`src/app/api/auth/tiktok/start/route.ts`) was using `Math.random().toString(36).substring(2, 15)` to generate the CSRF state token.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure. Attackers could potentially predict the sequence of random numbers and spoof the CSRF state token to bypass protection.
**Prevention:** Always use `crypto.randomUUID()` (available in Node.js 16+ globally) or `node:crypto`'s `randomBytes` for generating security-sensitive values like OAuth state parameters, CSRF tokens, session IDs, and random secrets.
