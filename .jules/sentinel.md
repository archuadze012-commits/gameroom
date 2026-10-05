## 2025-03-01 - Avoid Math.random() for Security Tokens
**Vulnerability:** The TikTok OAuth start route (`src/app/api/auth/tiktok/start/route.ts`) used `Math.random().toString(36).substring(2, 15)` to generate a CSRF state token. This generates a predictable token that is susceptible to CSRF bypass attacks.
**Learning:** `Math.random()` is a pseudo-random number generator (PRNG) and is not cryptographically secure. It should never be used to generate security-sensitive values like session IDs, CSRF tokens, or cryptographic keys.
**Prevention:** Always use cryptographically secure random number generators (CSPRNGs) such as `crypto.randomUUID()` (in modern Node/Browser environments) or `crypto.randomBytes()` (from `node:crypto`) when generating unpredictable security tokens.
