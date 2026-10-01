## 2024-05-24 - Use cryptographically secure generators for CSRF
**Vulnerability:** Weak PRNG (`Math.random()`) used for TikTok OAuth CSRF state variable.
**Learning:** `Math.random()` provides predictable numbers that an attacker can guess, allowing them to forge OAuth CSRF state checks and link malicious accounts to logged-in users.
**Prevention:** Use `crypto.randomUUID()` in environments like Node.js or edge workers to generate globally unique, unpredictable identifiers for state tokens.
