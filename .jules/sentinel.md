## 2024-06-06 - [Fix weak RNG in TikTok OAuth CSRF state]
**Vulnerability:** Weak random number generation (`Math.random()`) used for OAuth CSRF protection state.
**Learning:** `Math.random()` generates predictable values which can be exploited.
**Prevention:** Always use cryptographically secure random number generators like `crypto.randomUUID()` when generating security-sensitive tokens.
