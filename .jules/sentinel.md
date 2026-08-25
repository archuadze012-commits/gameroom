## 2025-02-18 - Math.random() is predictable and insecure for state generation
**Vulnerability:** The TikTok OAuth start route used `Math.random()` to generate the `state` variable for CSRF protection.
**Learning:** `Math.random()` is a pseudo-random number generator that is cryptographically insecure. Using it for sensitive security elements like OAuth state tokens or session IDs allows an attacker to predict the value, potentially leading to CSRF attacks where the attacker forces their account to be linked to the victim's session.
**Prevention:** Always use cryptographically secure random number generators, such as `crypto.randomUUID()` (available in modern Node/Edge runtimes) or `node:crypto`'s `randomBytes`, for any security-sensitive token generation.
