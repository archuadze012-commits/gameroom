import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { awardXp } from "@/lib/gamification";
import { sendPushToUser } from "@/lib/push";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  // Insert the comment
  const { data: comment, error: commentErr } = await supabase
    .from("news_comments")
    .insert({
      article_id: article.id,
      user_id: user.id,
      body: commentBody,
      parent_id: body.parentId || null,
    })
    .select("id, created_at")
    .single();

  if (commentErr || !comment) {
    console.error("[POST /api/news/[slug]/comments]", commentErr);
    return NextResponse.json({ error: "failed_to_create_comment" }, { status: 500 });
  }

  // Notify the article author if they are not the commenter
  if (article.author_id && article.author_id !== user.id) {
    const commenterName = user.user_metadata?.username || user.email?.split("@")[0] || "ვიღაცამ";

    // 1. Save to notifications table
    await supabase.from("notifications").insert({
      user_id: article.author_id,
      type: "news_comment",
      title: "ახალი კომენტარი სიახლეზე 📰",
      body: `${commenterName}-მა კომენტარი დატოვა შენს სტატიაზე: "${article.title}"`,
      link: `/news/${slug}`,
    });

    // 2. Send push notification
    sendPushToUser(article.author_id, {
      title: "ახალი კომენტარი სიახლეზე 📰",
      body: `${commenterName}-მა კომენტარი დატოვა შენს სტატიაზე: "${article.title}"`,
      url: `/news/${slug}`,
      tag: `news-comment-${article.id}`,
    }).catch(() => {});
  }

  // Award XP for posting comment
  try {
    await awardXp(user.id, 2);
  } catch {}

  return NextResponse.json(comment, { status: 201 });
}
