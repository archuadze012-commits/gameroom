## 2024-03-24 - Insecure CSRF Token Generation
**Vulnerability:** Used `Math.random()` to generate CSRF `state` tokens in OAuth flows.
**Learning:** `Math.random()` is pseudo-random and not cryptographically secure. It can be predicted, making CSRF protection ineffective.
**Prevention:** Always use `crypto.randomUUID()` or `crypto.randomBytes()` for security-sensitive random values like CSRF tokens.
