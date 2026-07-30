## 2025-03-09 - Insecure CSRF State Generation in OAuth Flow
**Vulnerability:** The TikTok OAuth initialization flow (`src/app/api/auth/tiktok/start/route.ts`) was using `Math.random().toString(36).substring(2, 15)` to generate the CSRF state token.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, making it predictable and exposing the OAuth flow to CSRF attacks.
**Prevention:** Always use cryptographically secure functions like `crypto.randomUUID()` or `node:crypto`'s `randomBytes` (e.g., `randomBytes(16).toString("hex")`) when generating security-sensitive values like OAuth CSRF state tokens.
