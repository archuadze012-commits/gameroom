## 2024-05-18 - [Insecure CSRF Token Generation in OAuth Flow]
**Vulnerability:** Used `Math.random()` to generate the `state` parameter for TikTok OAuth CSRF protection.
**Learning:** `Math.random()` is not a cryptographically secure pseudo-random number generator (CSPRNG), meaning attackers could potentially predict state tokens and execute CSRF attacks against the OAuth callback.
**Prevention:** Always use `crypto.randomUUID()` (available globally in modern Node/Next.js Edge) or `node:crypto.randomBytes()` for generating unguessable security tokens (e.g., CSRF tokens, session IDs, password resets).
