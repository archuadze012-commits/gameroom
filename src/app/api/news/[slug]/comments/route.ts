import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { awardBonusXpCapped } from "@/lib/gamification";
import { sendPushToUser } from "@/lib/push";
import { rateLimitShared } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderate";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:news-comments");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimitShared(`news-comment:${user.id}`, 15, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { slug } = await params;
  let body: { body?: string; parentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const commentBody = (body.body ?? "").trim();
  if (!commentBody || commentBody.length > 2000) {
    return NextResponse.json({ error: "comment_body_invalid" }, { status: 400 });
  }

  // Blocklist + toxicity gate before the comment is stored.
  const mod = await moderateText(commentBody).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) {
    return NextResponse.json({ error: "content_blocked", reason: mod.reason }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Find the article
  const { data: article, error: articleErr } = await supabase
    .from("news_articles")
    .select("id, author_id, title")
    .eq("slug", slug)
    .single();

  if (articleErr || !article) {
    return NextResponse.json({ error: "article_not_found" }, { status: 404 });
  }

  // Insert the comment (parent_id column does not exist on news_comments,
  // so threaded replies are flat for now)
  const { data: comment, error: commentErr } = await supabase
    .from("news_comments")
    .insert({
      article_id: article.id,
      user_id: user.id,
      body: commentBody,
    })
    .select("id, created_at")
    .single();

  if (commentErr || !comment) {
    logger.error("failed to insert news comment", { userId: user.id, articleId: article.id, error: commentErr });
    return NextResponse.json({ error: "failed_to_create_comment" }, { status: 500 });
  }

  // Notify the article author if they are not the commenter
  if (article.author_id && article.author_id !== user.id) {
    const commenterName = user.user_metadata?.username || user.email?.split("@")[0] || "ვიღაცამ";

    // 1. Save to notifications table
    const { error: notificationError } = await createSupabaseAdminClient().from("notifications").insert({
      user_id: article.author_id,
      type: "news_comment",
      title: "ახალი კომენტარი სიახლეზე 📰",
      body: `${commenterName}-მა კომენტარი დატოვა შენს სტატიაზე: "${article.title}"`,
      link: `/news/${slug}`,
    });
    if (notificationError) {
      logger.warn("failed to write news comment notification", {
        articleId: article.id,
        recipientId: article.author_id,
        error: notificationError,
      });
    }

    // 2. Send push notification
    sendPushToUser(article.author_id, {
      title: "ახალი კომენტარი სიახლეზე 📰",
      body: `${commenterName}-მა კომენტარი დატოვა შენს სტატიაზე: "${article.title}"`,
      url: `/news/${slug}`,
      tag: `news-comment-${article.id}`,
    }).catch(() => {});
  }

  // Award XP for posting comment — capped per day (anti-farm; mirrors feed/lfg).
  await awardBonusXpCapped(user.id, 2, "news_comment", 10);

  return NextResponse.json(comment, { status: 201 });
}
