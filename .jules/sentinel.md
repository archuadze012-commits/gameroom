## 2025-02-23 - Insecure CSRF Token Generation
**Vulnerability:** Used `Math.random()` to generate CSRF state tokens in the TikTok OAuth flow. `Math.random()` is a pseudo-random number generator and is not cryptographically secure, meaning generated values can potentially be predicted or guessed, allowing CSRF attacks.
**Learning:** `Math.random()` was likely used out of convenience for quickly generating random strings. However, standard JavaScript pseudo-randomness should never be used for security tokens.
**Prevention:** Always use cryptographically secure methods like `crypto.randomUUID()` or `crypto.getRandomValues()` when generating tokens used for security purposes (like CSRF protection, auth tokens, secrets).
