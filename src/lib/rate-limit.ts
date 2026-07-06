// Lightweight in-memory rate limiter (per-instance). Good enough to stop
// casual abuse / quota burn on the AI endpoints. For multi-instance
// production hardening, back this with Redis/Upstash instead.

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute
const MAX_BUCKETS = 5000;

function cleanupExpiredBuckets(now: number) {
  const needsCleanup = (now - lastCleanup >= CLEANUP_INTERVAL_MS) || (buckets.size > MAX_BUCKETS);
  if (!needsCleanup) return;
  lastCleanup = now;

  for (const [key, bucket] of buckets) {
    if (now > bucket.reset) {
      buckets.delete(key);
    }
  }

  if (buckets.size > MAX_BUCKETS) {
    buckets.clear();
  }
}

/**
 * Returns true if the call is allowed, false if the limit is exceeded.
 * @param key    unique caller key (e.g. `ai:<userId>`)
 * @param limit  max calls allowed within the window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

/**
 * Distributed rate limit — shared across all serverless instances via the
 * rate_limit_hit Postgres RPC. Use this on abuse-sensitive endpoints (auth,
 * reports, AI cost-burn, scraping) where the per-instance `rateLimit` above is
 * too weak on multi-instance production. Falls back to the in-memory limiter if
 * the RPC errors, so it degrades to per-instance but NEVER fails open.
 *
 * Async (it does a DB round-trip) — every caller must `await` it. The admin
 * client is imported lazily so this module stays client-safe.
 */
export async function rateLimitShared(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) throw new Error(error.message);
    return data === true;
  } catch {
    // Degrade to the per-instance limiter rather than fail open.
    return rateLimit(key, limit, windowMs);
  }
}

// ---------------------------------------------------------------------------
// Pre-built helpers
// ---------------------------------------------------------------------------

const ONE_DAY_MS = 86_400_000;

/**
 * Rate-limit new signups: max 2 new accounts per IP address per 24 hours.
 * Distributed (holds across instances). Returns `true` if allowed.
 */
export async function signupRateLimit(ip: string): Promise<boolean> {
  return rateLimitShared(`signup:${ip}`, 2, ONE_DAY_MS);
}
