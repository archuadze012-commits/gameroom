import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { awardBonusXp } from "@/lib/gamification";
import { rateLimitShared } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderate";
import { createLogger } from "@/lib/logger";
import { FORUM_THREAD_BODY_MAX_LENGTH, FORUM_THREAD_TITLE_MAX_LENGTH } from "@/lib/constants";

const logger = createLogger("api:forum-threads");

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u10D0-\u10FA-]/g, ""); // Supports both English and Georgian letters
}

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimitShared(`forum-thread:${user.id}`, 5, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { categorySlug?: string; title?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const categorySlug = body.categorySlug;
  const title = (body.title ?? "").trim();
  const postBody = (body.body ?? "").trim();

  if (!categorySlug) return NextResponse.json({ error: "category_slug_required" }, { status: 400 });
  if (!title || title.length > FORUM_THREAD_TITLE_MAX_LENGTH)
    return NextResponse.json({ error: "title_invalid" }, { status: 400 });
  if (!postBody || postBody.length > FORUM_THREAD_BODY_MAX_LENGTH)
    return NextResponse.json({ error: "body_invalid" }, { status: 400 });

  // Blocklist + toxicity gate on title + body before creating the thread.
  const mod = await moderateText(`${title} ${postBody}`).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) {
    return NextResponse.json({ error: "content_blocked", reason: mod.reason }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Find the category
  const { data: cat, error: catErr } = await supabase
    .from("forum_categories")
    .select("id, slug")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (catErr) {
    logger.error("failed to load forum category", { categorySlug, error: catErr });
    return NextResponse.json({ error: "failed_to_load_category" }, { status: 500 });
  }
  if (!cat) {
    return NextResponse.json({ error: "category_not_found" }, { status: 404 });
  }

  // Generate slug
  let slug = slugify(title);
  if (!slug) slug = "thread";
  
  // Check conflict and append suffix if needed
  const { data: existing } = await supabase
    .from("forum_threads")
    .select("id")
    .eq("category_id", cat.id)
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  // 1. Create thread
  const { data: thread, error: threadErr } = await supabase
    .from("forum_threads")
    .insert({
      category_id: cat.id,
      author_id: user.id,
      title,
      slug,
      views: 0,
      last_reply_at: new Date().toISOString(),
    })
    .select("id, slug")
    .single();

  if (threadErr || !thread) {
    logger.error("failed to insert forum thread", { userId: user.id, categoryId: cat.id, error: threadErr });
    return NextResponse.json({ error: "failed_to_create_thread" }, { status: 500 });
  }

  // 2. Create first post (body of the thread)
  const { error: postErr } = await supabase
    .from("forum_posts")
    .insert({
      thread_id: thread.id,
      author_id: user.id,
      body: postBody,
    });

  if (postErr) {
    logger.error("failed to insert initial forum post", { userId: user.id, threadId: thread.id, error: postErr });
    // Delete thread to avoid orphaned threads
    const { error: rollbackError } = await supabase.from("forum_threads").delete().eq("id", thread.id);
    if (rollbackError) {
      logger.error("failed to rollback thread after initial post insert failure", {
        threadId: thread.id,
        error: rollbackError,
      });
    }
    return NextResponse.json({ error: "failed_to_create_initial_post" }, { status: 500 });
  }

  // Award XP for creating thread
  await awardBonusXp(user.id, 10, "forum:create-thread");

  return NextResponse.json({
    ok: true,
    slug: thread.slug,
    categorySlug: cat.slug,
  }, { status: 201 });
}
