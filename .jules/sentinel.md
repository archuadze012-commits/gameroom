## 2025-03-02 - Secure Cron Endpoints Authorization

**Vulnerability:** Timing attack vulnerability in the authorization header comparison.
**Learning:** Checking the `CRON_SECRET` using standard equality checks (e.g., `!==`) leaks timing information that an attacker can use to brute-force the secret token over time by observing the response times.
**Prevention:** Use constant-time comparison methods, such as `crypto.timingSafeEqual` (from `node:crypto`), and securely match `byteLength` before comparison.
