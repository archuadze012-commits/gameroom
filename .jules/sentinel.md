## 2024-06-23 - Predictable PRNG in OAuth State Token
**Vulnerability:** The TikTok OAuth initialization endpoint (`src/app/api/auth/tiktok/start/route.ts`) used `Math.random().toString(36).substring(2, 15)` to generate the CSRF state token.
**Learning:** `Math.random()` is not a cryptographically secure pseudo-random number generator (CSPRNG). Its output is predictable, allowing an attacker to potentially guess the state token and launch CSRF attacks during the OAuth flow.
**Prevention:** Always use a CSPRNG, such as `crypto.randomUUID()` or `crypto.getRandomValues()`, for generating security-critical tokens, nonces, and session identifiers. Avoid `Math.random()` for anything related to security.
