## 2024-05-18 - Insecure Random Number Generation for CSRF Tokens
**Vulnerability:** The TikTok OAuth flow used `Math.random()` to generate CSRF protection tokens (`state` parameter). `Math.random()` is not cryptographically secure and can be predictable, potentially allowing an attacker to forge the state token and bypass CSRF protection.
**Learning:** `Math.random()` should never be used for security-sensitive operations like generating tokens, passwords, or keys. It is only suitable for non-security-critical features (like UI animations or game logic).
**Prevention:** Always use cryptographically secure random number generators (CSPRNG) for security features. In Node.js/browser environments, use `crypto.randomUUID()` or `crypto.getRandomValues()` instead.
