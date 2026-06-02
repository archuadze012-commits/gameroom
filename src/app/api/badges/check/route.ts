import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";

// Checks the current user's stats and unlocks any newly-earned badges.
// Called from the client when post/follow/like events happen.
export async function POST() {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServerClient();

  const [
    { data: profile },
    { count: postsCount },
    { data: postIds },
    { count: followersCount },
    { data: existingBadges },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("xp, level, daily_streak_count, is_verified")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", user.id).is("deleted_at", null),
    supabase.from("posts").select("id").eq("author_id", user.id).is("deleted_at", null),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
    supabase.from("badge_unlocks").select("badge_code").eq("user_id", user.id),
  ]);

  // Sum likes received
  let likesReceived = 0;
  const ids = (postIds ?? []).map((p: { id: string }) => p.id);
  if (ids.length > 0) {
    const { count } = await supabase.from("post_likes").select("*", { count: "exact", head: true }).in("post_id", ids);
    likesReceived = count ?? 0;
  }

  const owned = new Set((existingBadges ?? []).map((b: { badge_code: string }) => b.badge_code));
  const toUnlock: string[] = [];

  if ((postsCount ?? 0) >= 1 && !owned.has("first_post")) toUnlock.push("first_post");
  if ((postsCount ?? 0) >= 10 && !owned.has("ten_posts")) toUnlock.push("ten_posts");
  if (likesReceived >= 100 && !owned.has("hundred_likes")) toUnlock.push("hundred_likes");
  if ((followersCount ?? 0) >= 10 && !owned.has("ten_followers")) toUnlock.push("ten_followers");
  if ((followersCount ?? 0) >= 100 && !owned.has("hundred_followers")) toUnlock.push("hundred_followers");
  if ((profile?.daily_streak_count ?? 0) >= 7 && !owned.has("streak_7")) toUnlock.push("streak_7");
  if ((profile?.daily_streak_count ?? 0) >= 30 && !owned.has("streak_30")) toUnlock.push("streak_30");
  if (profile?.is_verified && !owned.has("verified")) toUnlock.push("verified");
  if ((profile?.level ?? 1) >= 10 && !owned.has("level_10")) toUnlock.push("level_10");
  if ((profile?.level ?? 1) >= 25 && !owned.has("level_25")) toUnlock.push("level_25");

  if (toUnlock.length > 0) {
    // Eligibility is computed server-side above; write via the service-role
    // client so the badge_unlocks table can deny direct client inserts (RLS).
    const admin = createSupabaseAdminClient();
    await admin
      .from("badge_unlocks")
      .insert(toUnlock.map((code) => ({ user_id: user.id, badge_code: code })));
  }

  return NextResponse.json({ unlocked: toUnlock });
}
