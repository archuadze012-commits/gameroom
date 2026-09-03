## 2024-05-18 - Insecure Randomness in CSRF State Generation
**Vulnerability:** Weak, non-cryptographically secure pseudo-random number generator (`Math.random()`) used for generating OAuth CSRF state tokens in `src/app/api/auth/tiktok/start/route.ts`.
**Learning:** `Math.random()` produces predictable values that can be guessed or brute-forced by an attacker, allowing them to bypass CSRF protection. Security-critical values, such as CSRF tokens or passwords, must be generated using cryptographically secure methods.
**Prevention:** Always use `crypto.randomUUID()` (available globally in modern Node.js versions) or `node:crypto`'s `randomBytes()` when generating random strings, tokens, or identifiers that require cryptographic security and unpredictability.
