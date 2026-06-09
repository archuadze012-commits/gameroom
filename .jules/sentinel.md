## 2024-05-24 - Insecure CSRF Token Generation
**Vulnerability:** Weak, predictable CSRF state token generation using `Math.random().toString(36)` in the TikTok OAuth flow.
**Learning:** `Math.random()` is not cryptographically secure and can be easily predicted, compromising the CSRF protection of the OAuth process. It was likely used for convenience instead of standard crypto APIs.
**Prevention:** Always use `crypto.randomUUID()` or `crypto.getRandomValues()` to generate security-sensitive tokens like CSRF state strings or API keys.
