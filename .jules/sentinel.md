## 2026-08-09 - Insecure CSRF state token generation
**Vulnerability:** The application was using `Math.random().toString(36)` to generate the CSRF state token for the TikTok OAuth flow.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure. This could allow an attacker to predict the state token and potentially perform CSRF attacks during the OAuth flow.
**Prevention:** Always use cryptographically secure methods like `crypto.randomUUID()` or `crypto.getRandomValues()` for generating any security-sensitive tokens, passwords, or identifiers.