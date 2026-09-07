## 2024-09-07 - [Insecure CSRF Token Generation]
**Vulnerability:** Weak, predictable CSRF token generation using `Math.random().toString(36).substring(2, 15)` in the TikTok OAuth authentication flow (`src/app/api/auth/tiktok/start/route.ts`).
**Learning:** `Math.random()` is not cryptographically secure and predictable. Utilizing it for CSRF protection states opens an avenue for attackers to guess or calculate valid state parameters to bypass CSRF validation.
**Prevention:** Always use cryptographically secure random number generators like `crypto.randomUUID()` or `randomBytes(16).toString("hex")` (from `node:crypto`) when generating security-sensitive tokens such as OAuth states, session IDs, or password reset tokens.
