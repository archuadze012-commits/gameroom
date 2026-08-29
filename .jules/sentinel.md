## 2025-03-01 - Insecure Randomness in OAuth CSRF Token
**Vulnerability:** Found `Math.random()` used to generate the OAuth state parameter (CSRF token) in `src/app/api/auth/tiktok/start/route.ts`.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, which allows attackers to potentially guess or predict the token.
**Prevention:** Use cryptographically secure methods like `crypto.randomUUID()` or `node:crypto`'s `randomBytes` when generating security-sensitive values such as OAuth CSRF state tokens.