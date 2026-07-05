import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// True if either user has blocked the other. Blocking is symmetric in effect:
// once A blocks B, neither can DM or message the other. Uses the service-role
// client because a session-scoped read only sees the caller's own blocks (per
// RLS), but the gates need to check the OTHER direction too ("has B blocked A").
export async function isBlocked(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return false;
  const db = createSupabaseAdminClient();
  // Both a and b are among {blocker, blocked}. Since a !== b and self-blocks are
  // constrained out, the only rows this can match are the two directional pairs
  // (a→b, b→a) — so a hit means one of them has blocked the other.
  const { data } = await db
    .from("user_blocks")
    .select("blocker_id")
    .in("blocker_id", [a, b])
    .in("blocked_id", [a, b]);
  return (data?.length ?? 0) > 0;
}

// Direction-specific: has `blockerId` blocked `blockedId`? Used to seed the
// BlockButton's label (you can only un-block a block you created).
export async function hasBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  if (!blockerId || !blockedId || blockerId === blockedId) return false;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("user_blocks")
    .select("blocker_id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();
  return Boolean(data);
}

// Whether `senderId` may START a new DM with `recipientId`, per the recipient's
// dm_privacy preference: everyone (default) → yes; nobody → no; followers → only
// if the sender follows the recipient. Existing conversations are unaffected —
// callers should check this only when creating a new one. Service-role read
// (needs the recipient's own profile + the follow edge).
export async function canReceiveDmFrom(recipientId: string, senderId: string): Promise<boolean> {
  const db = createSupabaseAdminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("dm_privacy")
    .eq("id", recipientId)
    .maybeSingle();

  const pref = profile?.dm_privacy ?? "everyone";
  if (pref === "everyone") return true;
  if (pref === "nobody") return false;

  // 'followers' — the sender must follow the recipient.
  const { data: follow } = await db
    .from("follows")
    .select("follower_id")
    .eq("follower_id", senderId)
    .eq("following_id", recipientId)
    .maybeSingle();
  return Boolean(follow);
}
