// Lightweight in-memory rate limiter (per-instance). Good enough to stop
// casual abuse / quota burn on the AI endpoints. For multi-instance
// production hardening, back this with Redis/Upstash instead.

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

/**
 * Returns true if the call is allowed, false if the limit is exceeded.
 * @param key    unique caller key (e.g. `ai:<userId>`)
 * @param limit  max calls allowed within the window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}
