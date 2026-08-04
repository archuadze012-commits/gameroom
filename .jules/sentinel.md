
## 2024-05-24 - Math.random() usage for CSRF protection
**Vulnerability:** The TikTok OAuth start route (`src/app/api/auth/tiktok/start/route.ts`) was using `Math.random().toString(36).substring(2, 15)` to generate a CSRF state token.
**Learning:** `Math.random()` is not cryptographically secure, and the values it generates can be predicted. In the context of OAuth, this could potentially allow an attacker to bypass CSRF protections. This codebase correctly uses `randomBytes` from `node:crypto` in other OAuth flows (e.g., Steam), but missed it here.
**Prevention:** Always use a cryptographically secure random number generator (like `node:crypto`'s `randomBytes` or `crypto.randomUUID()`) when generating tokens, passwords, or other security-sensitive values.
