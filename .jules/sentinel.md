## 2023-10-24 - Insecure Randomness in OAuth CSRF Token
**Vulnerability:** The TikTok OAuth flow in `src/app/api/auth/tiktok/start/route.ts` used `Math.random().toString(36).substring(2, 15)` to generate the `state` parameter (CSRF token).
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, meaning an attacker could potentially guess or predict the tokens and perform CSRF attacks (e.g. linking an attacker-controlled TikTok account to the victim's session).
**Prevention:** Always use cryptographically secure sources of randomness (like `crypto.randomUUID()` or `node:crypto.randomBytes()`) when generating security tokens such as CSRF states or session IDs.
