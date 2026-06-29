## 2024-05-18 - Fix weak CSRF token generation in TikTok OAuth
**Vulnerability:** Weak CSRF token generation using `Math.random()`.
**Learning:** `Math.random()` is a predictable pseudorandom number generator and not suitable for security purposes like generating CSRF tokens.
**Prevention:** Use cryptographically secure random number generators like `crypto.randomUUID()` or `crypto.getRandomValues()` for any security-related tokens or secrets.
