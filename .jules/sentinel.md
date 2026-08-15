## 2024-05-01 - Insecure CSRF State Token Generation
**Vulnerability:** Weak random number generation using `Math.random()` for OAuth CSRF state tokens.
**Learning:** `Math.random()` is a pseudo-random number generator and is predictable. It is not suitable for generating security-sensitive values like CSRF tokens, which could allow attackers to bypass CSRF protections if they predict the state value.
**Prevention:** Always use cryptographically secure random number generators like `crypto.randomUUID()` or `node:crypto`'s `randomBytes` for security-sensitive tokens.
