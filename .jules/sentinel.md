## 2024-08-02 - Insecure Randomness in OAuth State
**Vulnerability:** Found `Math.random()` being used to generate the CSRF protection state token for TikTok OAuth in `src/app/api/auth/tiktok/start/route.ts`.
**Learning:** `Math.random()` is a pseudo-random number generator (PRNG) and is predictable. It should never be used to generate security-sensitive tokens, keys, or passwords. Using it for CSRF tokens undermines the CSRF protection as an attacker might be able to predict the state value.
**Prevention:** Always use a cryptographically secure pseudo-random number generator (CSPRNG) like `crypto.randomUUID()` (available globally in modern Node/Edge environments) or `crypto.randomBytes()` for any security-sensitive values.
