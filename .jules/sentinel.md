## 2024-06-19 - Fix insecure CSRF state generation in TikTok OAuth
**Vulnerability:** Weak, predictable CSRF state generation using `Math.random().toString(36).substring(2, 15)`.
**Learning:** `Math.random()` does not provide cryptographically secure random numbers, making it unsuitable for generating security tokens like OAuth state parameter used for CSRF protection. Predictable state parameters can allow attackers to perform Cross-Site Request Forgery (CSRF) attacks.
**Prevention:** Always use a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG) such as `crypto.randomUUID()` or `crypto.getRandomValues()` for generating security tokens, salts, or passwords.
