## 2024-05-18 - Use cryptographically secure random number generators for security tokens
**Vulnerability:** CSRF protection state in TikTok OAuth was generated using `Math.random()`, which is not cryptographically secure and could potentially be guessed.
**Learning:** `Math.random()` provides pseudo-randomness meant for general use cases but fails security requirements. Attackers could potentially predict the generated tokens.
**Prevention:** Always use a cryptographically secure random number generator (CSPRNG) like `crypto.randomUUID()` or `crypto.getRandomValues()` for generating sensitive tokens, session IDs, passwords, and CSRF states.
