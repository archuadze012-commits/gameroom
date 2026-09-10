## 2025-02-28 - Avoid Math.random() for security sensitive values like OAuth states and CSRF tokens
**Vulnerability:** Using `Math.random()` to generate CSRF protection states or OAuth tokens makes them predictable and susceptible to guessing, as `Math.random()` is not a cryptographically secure Pseudo-Random Number Generator (PRNG).
**Learning:** This existed because `Math.random()` is the easiest and most familiar way to generate a string of random characters, often copied without considering the security implications in an authentication flow.
**Prevention:** Always use cryptographically secure methods like `crypto.randomUUID()` or `crypto.randomBytes()` when generating tokens, secrets, CSRF protections, or session IDs.
