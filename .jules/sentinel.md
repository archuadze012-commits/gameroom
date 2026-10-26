## 2026-10-26 - Timing Attack Vulnerability in Admin Cron Endpoints
**Vulnerability:** Direct string comparison (`authHeader !== \`Bearer \${secret}\``) was used to validate authentication headers in admin cron job endpoints, exposing the system to potential timing attacks where an attacker could theoretically deduce the secret token character by character.
**Learning:** Even internal or scheduled endpoints require robust security practices. Using basic inequality operators for secret comparison is insecure.
**Prevention:** Always use `crypto.timingSafeEqual` from `node:crypto` along with strict byte length checks before comparison to ensure constant-time secret validation in any endpoint checking authorization tokens.
