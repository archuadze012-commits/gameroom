import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { awardXp } from "@/lib/gamification";
import { sendPushToUser } from "@/lib/push";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!rateLimit(`forum-post:${user.id}`, 10, 60_000))
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
  if (!postBody || postBody.length > 5000) {
    return NextResponse.json({ error: "body_invalid" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Check if thread exists and get its details
  const { data: thread, error: threadErr } = await supabase
    .from("forum_threads")
    .select("id, author_id, title, category_id, slug, forum_categories(slug)")
    .eq("id", threadId)
    .single();

  if (threadErr || !thread) {
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
    console.error("[POST /api/forum/posts]", postErr);
    return NextResponse.json({ error: "failed_to_create_post" }, { status: 500 });
  }

  const now = new Date().toISOString();

  // Update thread's last_reply_at
  await supabase
    .from("forum_threads")
    .update({ last_reply_at: now })
    .eq("id", threadId);

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
    await createSupabaseAdminClient().from("notifications").insert({
      user_id: thread.author_id,
      type: "forum_reply",
      title: "ახალი გამოხმაურება ფორუმზე 💬",
      body: `${replierName}-მა უპასუხა შენს თემას: "${thread.title}"`,
      link: `/forum/${catSlug}/${thread.slug}`,
    });

    // 2. Send push notification
    sendPushToUser(thread.author_id, {
      title: "ახალი გამოხმაურება ფორუმზე 💬",
      body: `${replierName}-მა უპასუხა შენს თემას: "${thread.title}"`,
      url: `/forum/${catSlug}/${thread.slug}`,
      tag: `forum-reply-${threadId}`,
    }).catch(() => {});
  }

  // Award XP for posting reply
  try {
    await awardXp(user.id, 3);
  } catch {}

  return NextResponse.json(post, { status: 201 });
}
