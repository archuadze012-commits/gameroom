## 2025-03-01 - [Insecure CSRF Token Generation]
**Vulnerability:** Weak, predictable random number generation (`Math.random()`) used for a CSRF protection state token in the TikTok OAuth start route.
**Learning:** `Math.random()` generates pseudo-random numbers that can be predicted by attackers, breaking the security guarantee of CSRF tokens. State tokens must be cryptographically secure to effectively prevent CSRF attacks.
**Prevention:** Always use cryptographically secure methods like `crypto.randomUUID()` (available globally in Node >=19) or `randomBytes` from `node:crypto` for generating security-sensitive values (e.g., CSRF tokens, session IDs).
