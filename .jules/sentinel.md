## 2026-10-23 - Insecure Random Number Generation for CSRF Tokens
**Vulnerability:** Used `Math.random()` to generate the `state` token for TikTok OAuth CSRF protection.
**Learning:** `Math.random()` is not cryptographically secure and can be guessed/predicted, rendering the CSRF protection ineffective.
**Prevention:** Use the globally available Web Crypto API's `crypto.randomUUID()` instead of `Math.random()` for generating security-sensitive values like OAuth CSRF state tokens.
