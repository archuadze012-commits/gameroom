## 2026-11-09 - [Timing Attack in Cron Endpoints]
**Vulnerability:** Comparing `CRON_SECRET` using string inequality (`!==`) in cron API endpoints.
**Learning:** String inequality operators exit early on character mismatch, allowing an attacker to deduce the secret length and characters incrementally via a timing attack.
**Prevention:** Use `crypto.timingSafeEqual` with byte-length checks to guarantee constant-time comparison for secrets in authentication routines.
