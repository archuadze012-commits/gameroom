## 2024-03-21 - Insecure CSRF Token Generation
**Vulnerability:** OAuth CSRF `state` tokens were being generated using `Math.random().toString(36)`.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, making it predictable and vulnerable to CSRF attacks if an attacker can guess the token.
**Prevention:** Always use cryptographically secure methods like `crypto.randomUUID()` or `node:crypto.randomBytes()` for generating security-sensitive values like CSRF tokens, session IDs, or salts.