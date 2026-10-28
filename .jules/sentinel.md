## 2026-10-28 - Replace Math.random with crypto.randomUUID for CSRF Tokens
**Vulnerability:** Weak random number generation using `Math.random()` for TikTok OAuth CSRF state parameter. `Math.random()` is not cryptographically secure and predictable.
**Learning:** `Math.random()` should never be used for security-sensitive tokens (like OAuth state).
**Prevention:** Use the Web Crypto API's `crypto.randomUUID()` or `node:crypto`'s `randomBytes` instead for generating security-sensitive random values.
