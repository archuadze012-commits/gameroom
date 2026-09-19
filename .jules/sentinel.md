## 2024-05-16 - Math.random() is predictable and cryptographically insecure
**Vulnerability:** Weak random number generation for security purposes (CSRF token generation).
**Learning:** In `src/app/api/auth/tiktok/start/route.ts` the `Math.random()` function was used to generate an OAuth CSRF state parameter. `Math.random()` is not cryptographically secure, and the resulting state can be predicted.
**Prevention:** Use `crypto.randomBytes(16).toString("hex")` or `crypto.randomUUID()` when generating security-sensitive random values.
