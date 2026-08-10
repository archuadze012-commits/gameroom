## 2025-01-20 - Insecure Randomness in OAuth State Parameter
**Vulnerability:** Used `Math.random().toString(36).substring(2, 15)` to generate the CSRF `state` parameter in TikTok OAuth login flow.
**Learning:** `Math.random()` is a pseudo-random number generator and is completely predictable. This makes the generated OAuth `state` parameter vulnerable to CSRF attacks if an attacker guesses or predicts the sequence.
**Prevention:** Always use cryptographically secure randomness, such as `crypto.randomUUID()` (in modern Node.js edge environments) or `node:crypto.randomBytes` for any sensitive state parameters, session IDs, or tokens.
