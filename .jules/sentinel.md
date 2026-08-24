## 2025-02-18 - Math.random() usage for CSRF state generation
**Vulnerability:** Weak random number generation for OAuth CSRF state parameters using `Math.random()`. This allows an attacker to predict state values and bypass CSRF protection.
**Learning:** Developer mistakenly relied on `Math.random()` rather than a cryptographically secure method for generating random strings for OAuth `state` generation.
**Prevention:** Utilize the globally available `crypto.randomUUID()` (since the app targets Node 24.x) or `node:crypto`'s `randomBytes()` for generating random numbers used in security-critical contexts.
