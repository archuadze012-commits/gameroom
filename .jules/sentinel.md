## 2024-08-04 - Insecure PRNG for OAuth CSRF State Token
**Vulnerability:** The TikTok OAuth initialization flow (`src/app/api/auth/tiktok/start/route.ts`) used `Math.random().toString(36).substring(2, 15)` to generate the CSRF state token.
**Learning:** `Math.random()` is a pseudo-random number generator and is completely predictable. Using it to generate CSRF tokens allows an attacker to guess the token and potentially bypass the CSRF protection of the OAuth flow.
**Prevention:** Always use cryptographically secure random number generators (CSPRNG), such as `crypto.randomUUID()` or `crypto.randomBytes()`, for any security-sensitive values including session IDs, CSRF tokens, and passwords.
