import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { awardBonusXpOnce } from "@/lib/gamification";
import { rateLimitShared } from "@/lib/rate-limit";

type ResolveResult =
  | { ok: true; followerId: string; followingId: string }
  | { ok: false; status: 401 | 404 | 400; error: string };

async function resolveIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  username: string,
): Promise<ResolveResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "unauthorized" };
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();
  if (!target) return { ok: false, status: 404, error: "user not found" };
  if (target.id === user.id) return { ok: false, status: 400, error: "cannot follow yourself" };
  return { ok: true, followerId: user.id, followingId: target.id };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const ids = await resolveIds(supabase, username);
  if (!ids.ok) return NextResponse.json({ error: ids.error }, { status: ids.status });

  // Shared follow/unfollow budget per user — blocks the follow→unfollow→follow
  // loop that would otherwise fire an unbounded stream of push notifications at
  // one victim (each fresh follow sends a push, below).
  if (!(await rateLimitShared(`follow:${ids.followerId}`, 30, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: ids.followerId, following_id: ids.followingId });

  if (error && error.code !== "23505") // ignore duplicate
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Push notification + XP for the followed user (not the follower)
  try {
    if (!error) {
      const { data: follower } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", ids.followerId)
        .maybeSingle();
      const name = follower?.display_name ?? follower?.username ?? "ვინმე";
      const followUrl = `/profile/${follower?.username ?? ""}`;

      // In-app notification (the realtime widget) — previously a follow only
      // fired a push, so push-less users (the majority) saw nothing.
      const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
      await createSupabaseAdminClient().from("notifications").insert({
        user_id: ids.followingId,
        type: "follow",
        title: `${name}-მ გამოგიწერა 👤`,
        body: "ნახე ვინ მოგწერა და დაუბრუნე",
        link: followUrl,
      });

      const { sendPushToUser } = await import("@/lib/push");
      await sendPushToUser(ids.followingId, {
        title: `${name}-მ გამოგიწერა`,
        body: "ნახე ვინ მოგწერა და დაუბრუნე",
        url: followUrl,
        tag: `follow-${ids.followerId}`,
      });

      // Award XP to the followed user — only ONCE per (follower, following) pair,
      // so follow→unfollow→follow can't farm XP.
      await awardBonusXpOnce(ids.followingId, 5, "follow", `${ids.followerId}:${ids.followingId}`);
    }
  } catch {}

  return NextResponse.json({ following: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const ids = await resolveIds(supabase, username);
  if (!ids.ok) return NextResponse.json({ error: ids.error }, { status: ids.status });

  // Same shared budget as POST — the abuse vector is rapid follow/unfollow
  // toggling, so unfollows draw from the same bucket.
  if (!(await rateLimitShared(`follow:${ids.followerId}`, 30, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", ids.followerId)
    .eq("following_id", ids.followingId);

  return NextResponse.json({ following: false });
}
