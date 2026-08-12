## 2024-03-21 - Insecure Randomness in OAuth CSRF Token Generation
**Vulnerability:** The TikTok OAuth initialization endpoint (`src/app/api/auth/tiktok/start/route.ts`) was using `Math.random().toString(36).substring(2, 15)` to generate the CSRF `state` token.
**Learning:** `Math.random()` is a pseudo-random number generator (PRNG) and is not cryptographically secure. Attackers could potentially predict the generated state tokens, leading to CSRF vulnerabilities in the OAuth flow.
**Prevention:** Always use cryptographically secure random number generation methods for security-sensitive values like OAuth CSRF state tokens, session IDs, or password reset tokens. In modern Node.js environments, `crypto.randomUUID()` or `node:crypto`'s `randomBytes` should be used instead.
