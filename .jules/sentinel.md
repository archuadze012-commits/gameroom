## 2026-11-10 - Fix Timing Attack Vulnerabilities in Auth
**Vulnerability:** Comparing sensitive authorization headers (e.g. cron secrets) using strict string equality (`authHeader !== 'Bearer ${secret}'`), exposing the endpoints to timing attacks.
**Learning:** Simple string comparison exits at the first non-matching character, allowing attackers to incrementally guess the secret by measuring the response time.
**Prevention:** Use `crypto.timingSafeEqual` with `Buffer.byteLength` checks for all secret string comparisons to ensure constant-time verification.
