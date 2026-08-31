## 2024-05-24 - Weak CSRF Token Generation
**Vulnerability:** Used `Math.random().toString(36).substring(2, 15)` to generate OAuth CSRF state tokens.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, making the state tokens predictable and vulnerable to CSRF attacks.
**Prevention:** Use `crypto.randomUUID()` or `node:crypto`'s `randomBytes` for generating security-sensitive values like CSRF tokens.
