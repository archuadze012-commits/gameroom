## 2024-08-06 - [Insecure CSRF Token Generation]
**Vulnerability:** Used `Math.random()` for CSRF state token generation.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, making tokens predictable and vulnerable to CSRF attacks.
**Prevention:** Always use `crypto.randomUUID()` or `node:crypto`'s `randomBytes` for generating security-sensitive values like OAuth CSRF state tokens.
