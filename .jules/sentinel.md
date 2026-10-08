## 2025-02-14 - Fix Weak CSRF Token Generation

**Vulnerability:** The CSRF token for the TikTok OAuth flow was being generated using the cryptographically insecure `Math.random()`.
**Learning:** Pseudo-random functions like `Math.random()` should not be used to generate security-sensitive tokens, because they do not provide sufficient entropy and can be predicted.
**Prevention:** Always use cryptographically secure random number generators (e.g., `crypto.randomBytes()`, or `crypto.randomUUID()`) when generating security-sensitive values like session identifiers or CSRF tokens.
