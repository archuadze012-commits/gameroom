## 2024-05-18 - [Fix Insecure CSRF Token Generation in OAuth]
**Vulnerability:** Weak PRNG `Math.random()` was used to generate CSRF `state` tokens in the TikTok OAuth flow.
**Learning:** `Math.random()` is not cryptographically secure, and generated tokens can potentially be guessed, bypassing CSRF protection for OAuth account linking.
**Prevention:** Always use a CSPRNG like `crypto.randomUUID()` or `node:crypto`'s `randomBytes` for generating security-sensitive values (like OAuth `state` parameters, session IDs, or password reset tokens).
