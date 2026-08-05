## 2024-05-18 - Math.random() in TikTok OAuth state generator
**Vulnerability:** Found `Math.random()` being used to generate OAuth CSRF state parameter (`tiktok_oauth_state`) in `src/app/api/auth/tiktok/start/route.ts`.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, which means its sequence can be predicted, compromising CSRF protection during OAuth flows.
**Prevention:** Use `crypto.randomUUID()` or Node.js `crypto.randomBytes()` to generate secure, unguessable tokens for sensitive values like CSRF state.
