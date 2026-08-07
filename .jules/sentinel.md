## 2024-08-07 - Insecure Randomness in OAuth State

**Vulnerability:** Use of `Math.random()` to generate CSRF state tokens in OAuth flows (specifically `src/app/api/auth/tiktok/start/route.ts`). `Math.random()` is a pseudo-random number generator and is not cryptographically secure, making state tokens predictable and susceptible to CSRF attacks.

**Learning:** Developers sometimes reach for `Math.random()` for quick string/token generation without realizing its cryptographic weaknesses in security contexts like CSRF protection. Node.js environment has standard secure alternatives built-in.

**Prevention:** Always use cryptographically secure random number generators (CSPRNG) for security-sensitive values (tokens, secrets, state). Use `crypto.randomUUID()` or `node:crypto`'s `randomBytes` instead of `Math.random()`.