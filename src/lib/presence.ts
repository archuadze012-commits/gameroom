// A user is "online" if their last_seen_at heartbeat (refreshed on each /api/me
// call — see update-last-seen.ts) is within this window. 5 min matches the
// game-hub online count so the whole site agrees on who's online.
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export function isOnline(lastSeenAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return false;
  return now - t <= ONLINE_WINDOW_MS;
}

// ISO cutoff for "online since" — use in Supabase `.gt("last_seen_at", …)` filters.
export function onlineCutoffIso(now: number = Date.now()): string {
  return new Date(now - ONLINE_WINDOW_MS).toISOString();
}
