## 2023-10-27 - Predictable CSRF Tokens
**Vulnerability:** CSRF tokens (`state` parameter) were generated using `Math.random().toString(36)`.
**Learning:** `Math.random()` produces predictable sequences, making it theoretically possible to guess CSRF tokens and bypass protections during OAuth flows.
**Prevention:** Always use cryptographically secure random number generators (e.g., `crypto.randomUUID()` or `crypto.getRandomValues()`) for generating any security-sensitive tokens, keys, or IDs.
