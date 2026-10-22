## 2026-10-22 - Prevent Timing Attacks on CRON Endpoints
**Vulnerability:** CRON endpoints authenticated incoming requests using direct string comparison (`authHeader !== 'Bearer ${secret}'`). This allows attackers to potentially guess the secret character by character by measuring the time it takes for the comparison to fail (timing attack).
**Learning:** Even internal or automated endpoints (like Vercel Cron jobs) using bearer tokens or static secrets must use constant-time comparison methods, as string comparison short-circuits on the first mismatched character.
**Prevention:** Always use `crypto.timingSafeEqual` from `node:crypto` when comparing security-sensitive strings like tokens or secrets. Remember to compare the `.byteLength` of the Buffers before calling `timingSafeEqual`.
