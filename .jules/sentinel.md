## 2026-10-21 - Insecure Randomness in OAuth CSRF Token
**Vulnerability:** The TikTok OAuth initialization endpoint (`src/app/api/auth/tiktok/start/route.ts`) was using `Math.random().toString(36).substring(2, 15)` to generate the `state` token for CSRF protection.
**Learning:** `Math.random()` is not cryptographically secure and its outputs can be predicted. Relying on it for security-critical values such as CSRF tokens defeats the purpose of the protection and could allow an attacker to bypass it.
**Prevention:** Always use a cryptographically secure pseudo-random number generator (CSPRNG). In modern JavaScript/TypeScript (including Next.js), the Web Crypto API `crypto.randomUUID()` is globally available and should be used to generate secure random tokens.
