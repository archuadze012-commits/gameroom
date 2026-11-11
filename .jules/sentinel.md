## 2026-11-11 - Timing attack vulnerability in CRON secret validation
**Vulnerability:** Direct string comparison (`authHeader !== 'Bearer ${secret}'`) is used to validate the CRON secret in API routes.
**Learning:** Comparing secrets using the `!==` operator is vulnerable to timing attacks because it fails early when a character doesn't match. This can allow an attacker to guess the secret character by character by measuring the response time.
**Prevention:** Always use `crypto.timingSafeEqual` with byte-length validation to perform constant-time comparison when verifying secrets like CRON tokens.
