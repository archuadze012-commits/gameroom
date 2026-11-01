## 2026-11-01 - [Timing Attacks on Secret Comparisons]
**Vulnerability:** Direct string comparison (`authHeader !== 'Bearer ${secret}'`) was used when authenticating cron endpoints with `CRON_SECRET`.
**Learning:** Standard string comparisons stop at the first differing character, leaking the length and character sequence of the secret over time through timing variations, exposing it to brute-force timing attacks.
**Prevention:** Always compare secrets in constant time using `crypto.timingSafeEqual`. Make sure to compare the `.byteLength` of the Buffers before calling `timingSafeEqual` as it throws if lengths differ.
