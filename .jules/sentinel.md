## 2024-05-01 - Avoid Math.random() for security tokens
**Vulnerability:** Insecure CSRF state generation using `Math.random().toString(36).substring(2, 15)` in the TikTok OAuth flow.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, making the generated tokens predictable and vulnerable to CSRF attacks.
**Prevention:** Always use cryptographically secure methods like `crypto.randomUUID()` or `node:crypto`'s `randomBytes` for generating security-sensitive values such as CSRF tokens or session IDs.
