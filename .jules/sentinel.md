## 2024-03-24 - Avoid Math.random() for security-sensitive tokens
**Vulnerability:** The TikTok OAuth flow used `Math.random()` to generate the CSRF `state` token (`const state = Math.random().toString(36).substring(2, 15);`).
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, making the state parameter predictable and susceptible to CSRF attacks. It shouldn't be used for generating any security-related tokens, passwords, or salts.
**Prevention:** Always use cryptographically secure random number generators like `crypto.randomUUID()` (available in Node 24.x) or `node:crypto`'s `randomBytes()` when generating tokens for authentication, authorization, or CSRF protection.
