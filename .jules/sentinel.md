## 2024-05-01 - Insecure CSRF State Token Generation
**Vulnerability:** Pseudo-random `Math.random()` was used to generate the OAuth CSRF `state` parameter in the TikTok authentication flow (`src/app/api/auth/tiktok/start/route.ts`).
**Learning:** `Math.random()` is not cryptographically secure and predictable, which could allow an attacker to forge or guess the CSRF state token and execute Cross-Site Request Forgery (CSRF) attacks.
**Prevention:** Always use cryptographically secure random number generators (e.g., `crypto.randomUUID()` or `crypto.randomBytes()`) when generating security-sensitive values like CSRF tokens, session IDs, or passwords.
