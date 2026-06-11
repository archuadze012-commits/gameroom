## 2024-05-24 - Prevent Timing Attacks on Token Comparison
**Vulnerability:** Comparing the CRON secret with the provided `authorization` header using `!==` exposes the endpoint to a minor timing attack vulnerability.
**Learning:** Standard string comparison operators fail fast if characters don't match, allowing an attacker to deduce the token character by character based on response time.
**Prevention:** Always use a constant-time comparison function, like `crypto.timingSafeEqual` in Node.js, when verifying secrets, API keys, or tokens. Ensure strings are converted to Buffers and verify lengths first to prevent `timingSafeEqual` errors.
