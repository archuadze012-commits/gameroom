## 2024-05-16 - Insecure CSRF token generation
**Vulnerability:** Found `Math.random().toString(36).substring(2, 15)` being used to generate OAuth CSRF `state` tokens.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, meaning its outputs can potentially be predicted, rendering CSRF protection ineffective.
**Prevention:** Always use cryptographically secure random value generators like `crypto.randomUUID()` or `crypto.randomBytes()` for security-sensitive tokens, secrets, or identifiers.
