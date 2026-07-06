import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { awardBonusXpCapped } from "@/lib/gamification";
import { sendPushToUser } from "@/lib/push";
import { rateLimitShared } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderate";
import { createLogger } from "@/lib/logger";
import { FORUM_REPLY_BODY_MAX_LENGTH } from "@/lib/constants";

const logger = createLogger("api:forum-posts");

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimitShared(`forum-post:${user.id}`, 10, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { threadId?: string; body?: string; parentPostId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const threadId = body.threadId;
  const postBody = (body.body ?? "").trim();

  if (!threadId) return NextResponse.json({ error: "thread_id_required" }, { status: 400 });
  if (!postBody || postBody.length > FORUM_REPLY_BODY_MAX_LENGTH) {
    return NextResponse.json({ error: "body_invalid" }, { status: 400 });
  }

  // Blocklist + toxicity gate before the reply is stored.
  const mod = await moderateText(postBody).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) {
    return NextResponse.json({ error: "content_blocked", reason: mod.reason }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Check if thread exists and get its details
  const { data: thread, error: threadErr } = await supabase
    .from("forum_threads")
    .select("id, author_id, title, category_id, slug, forum_categories(slug)")
    .eq("id", threadId)
    .maybeSingle();

  if (threadErr) {
    logger.error("failed to load forum thread", { threadId, error: threadErr });
    return NextResponse.json({ error: "failed_to_load_thread" }, { status: 500 });
  }
  if (!thread) {
    return NextResponse.json({ error: "thread_not_found" }, { status: 404 });
  }

  // Insert the post
  const { data: post, error: postErr } = await supabase
    .from("forum_posts")
    .insert({
      thread_id: threadId,
      author_id: user.id,
      body: postBody,
      parent_post_id: body.parentPostId || null,
    })
    .select("id, created_at")
    .single();

  if (postErr || !post) {
    logger.error("failed to insert forum post", { userId: user.id, threadId, error: postErr });
    return NextResponse.json({ error: "failed_to_create_post" }, { status: 500 });
  }

  const now = new Date().toISOString();

  // Update thread's last_reply_at
  const { error: threadUpdateError } = await supabase
    .from("forum_threads")
    .update({ last_reply_at: now })
    .eq("id", threadId);
  if (threadUpdateError) {
    logger.error("failed to update thread last_reply_at", { threadId, error: threadUpdateError });
    return NextResponse.json({ error: "failed_to_update_thread" }, { status: 500 });
  }

  // Send notification to the thread author if they are not the replier
  if (thread.author_id !== user.id) {
    const replierName = user.user_metadata?.username || user.email?.split("@")[0] || "ვიღაცამ";
    
    const category =
      Array.isArray(thread.forum_categories)
        ? thread.forum_categories[0]
        : thread.forum_categories;
    const catSlug =
      category &&
      typeof category === "object" &&
      "slug" in category &&
      typeof category.slug === "string"
        ? category.slug
        : "general";

    // 1. Save to notifications table
    const { error: notificationError } = await createSupabaseAdminClient().from("notifications").insert({
      user_id: thread.author_id,
      type: "forum_reply",
      title: "ახალი გამოხმაურება ფორუმზე 💬",
      body: `${replierName}-მა უპასუხა შენს თემას: "${thread.title}"`,
      link: `/forum/${catSlug}/${thread.slug}`,
    });
    if (notificationError) {
      logger.warn("failed to write forum reply notification", {
        threadId,
        recipientId: thread.author_id,
        error: notificationError,
      });
    }

    // 2. Send push notification
    sendPushToUser(thread.author_id, {
      title: "ახალი გამოხმაურება ფორუმზე 💬",
      body: `${replierName}-მა უპასუხა შენს თემას: "${thread.title}"`,
      url: `/forum/${catSlug}/${thread.slug}`,
      tag: `forum-reply-${threadId}`,
    }).catch(() => {});
  }

  // Award XP for posting reply — capped per day (anti-farm; mirrors feed/lfg).
  await awardBonusXpCapped(user.id, 3, "forum_post", 10);

  return NextResponse.json(post, { status: 201 });
}
