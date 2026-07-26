## 2024-05-01 - [Insecure CSRF Token Generation]
**Vulnerability:** Found `Math.random()` being used to generate OAuth CSRF state tokens in `src/app/api/auth/tiktok/start/route.ts`.
**Learning:** `Math.random()` is a pseudo-random number generator (PRNG) and is not cryptographically secure, making it predictable and vulnerable to attacks where attackers can guess the state token and bypass CSRF protections.
**Prevention:** Always use a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG) like `crypto.randomUUID()` or `crypto.randomBytes()` for generating security-sensitive values such as tokens, passwords, or session IDs.
