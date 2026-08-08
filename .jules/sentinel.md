## 2024-05-16 - Insecure CSRF token generation
**Vulnerability:** Found `Math.random().toString(36).substring(2, 15)` being used to generate OAuth CSRF `state` tokens.
**Learning:** `Math.random()` is a pseudo-random number generator and is not cryptographically secure, meaning its outputs can potentially be predicted, rendering CSRF protection ineffective.
**Prevention:** Always use cryptographically secure random value generators like `crypto.randomUUID()` or `crypto.randomBytes()` for security-sensitive tokens, secrets, or identifiers.

## 2024-05-16 - Vercel Next.js Deployment CI Failures
**Vulnerability:** Not a vulnerability, but a critical deployment blocker where regex capture groups `/(.*)` in `vercel.json` broke Next.js routing deployments on platforms like Netlify/Cloudflare.
**Learning:** Next.js native configurations via `next.config.ts` handles path matching more reliably across different build environments than external `.json` configuration files when regex is involved.
**Prevention:** Always migrate `vercel.json` headers to `next.config.ts` using Next.js glob path matching syntax (e.g., `/:path*`) to prevent CI deployment failures on strict platforms.
