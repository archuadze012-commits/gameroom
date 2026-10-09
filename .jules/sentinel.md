
## 2026-10-09 - Fix Insecure Randomness in TikTok OAuth
**Vulnerability:** The `src/app/api/auth/tiktok/start/route.ts` endpoint was generating CSRF state tokens using `Math.random()`.
**Learning:** `Math.random()` is not a cryptographically secure pseudo-random number generator (CSPRNG), which means the generated CSRF tokens could potentially be predicted by an attacker.
**Prevention:** Always use a CSPRNG like `crypto.randomUUID()` or `node:crypto`'s `randomBytes` for generating security-critical tokens, such as OAuth state parameters, to ensure sufficient entropy and unpredictability.
