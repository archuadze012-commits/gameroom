## 2024-10-25 - Weak Random Number Generator for CSRF Token
**Vulnerability:** The TikTok OAuth start route (`src/app/api/auth/tiktok/start/route.ts`) used `Math.random()` to generate the `state` parameter for CSRF protection.
**Learning:** `Math.random()` is a cryptographically weak pseudo-random number generator (PRNG) and its outputs can be predicted, rendering the CSRF protection ineffective.
**Prevention:** Always use cryptographically secure random number generators (CSPRNG) like `crypto.randomUUID()` or `crypto.getRandomValues()` when generating security tokens, nonces, or passwords.
