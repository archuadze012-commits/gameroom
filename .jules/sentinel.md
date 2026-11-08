## 2026-11-08 - Fix insecure CSRF state generation in TikTok OAuth
**Vulnerability:** The TikTok OAuth start route (`src/app/api/auth/tiktok/start/route.ts`) was using `Math.random().toString(36)` to generate the CSRF state parameter. `Math.random()` is not cryptographically secure and its values can be predicted by an attacker, allowing them to bypass CSRF protection.
**Learning:** `Math.random()` was used for a security-sensitive token, compromising its unpredictability.
**Prevention:** Always use cryptographically secure pseudo-random number generators (CSPRNG) like `crypto.randomUUID()` or `node:crypto`'s `randomBytes()` for generating security tokens, nonces, and state parameters.
