## 2025-05-18 - [Insecure CSRF Token Generation in TikTok OAuth]
**Vulnerability:** The TikTok OAuth start route (`src/app/api/auth/tiktok/start/route.ts`) used `Math.random()` to generate the `state` parameter for CSRF protection. `Math.random()` is a pseudo-random number generator and is not cryptographically secure, meaning an attacker could potentially predict the generated state tokens.
**Learning:** Security-sensitive values, such as OAuth state tokens, must always be generated using cryptographically secure methods to prevent prediction and impersonation attacks.
**Prevention:** Use `crypto.randomUUID()` or `node:crypto`'s `randomBytes` instead of `Math.random()` for generating any security-critical tokens or identifiers.
## 2026-08-21 - [Dependency Conflicts Breaking Security Audit Updates]
**Vulnerability:** Attempting to directly update dependencies via 'npm audit fix --force' or 'overrides' in package.json led to EOVERRIDE conflicts or destructive breaking changes in core tools (like 'eslint', 'next' or 'drizzle-kit').
**Learning:** High severity dependency updates must be managed directly in the 'dependencies' or 'devDependencies' fields by pinning compatible minor/patch versions, rather than forcing updates or relying exclusively on 'overrides' which can break tree resolution.
**Prevention:** First try to pin updated compatible versions in 'dependencies' and 'devDependencies' instead of 'overrides', then run 'npm install' to properly update the lockfile.
