## 2024-09-05 - Insecure PRNG for OAuth CSRF State
**Vulnerability:** Found `Math.random().toString(36)` being used to generate the OAuth CSRF `state` parameter during TikTok authentication.
**Learning:** `Math.random()` is a pseudo-random number generator and is completely predictable. This allows an attacker to guess the CSRF token and potentially execute a CSRF attack on the OAuth flow.
**Prevention:** Always use cryptographically secure random number generators (CSPRNG) like `crypto.randomUUID()` or `crypto.getRandomValues()` for security-sensitive tokens, secrets, or identifiers.
