## 2024-11-20 - Avoid Math.random() for Security-Sensitive Values
**Vulnerability:** Found `Math.random()` being used to generate OAuth CSRF state tokens in `src/app/api/auth/tiktok/start/route.ts`.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, meaning its outputs can potentially be predicted, making it unsuitable for generating security tokens like CSRF states.
**Prevention:** Always use cryptographically secure random number generators like `crypto.randomUUID()` (available globally in modern Node environments as configured in this project) or `node:crypto`'s `randomBytes` for any security-sensitive values.
