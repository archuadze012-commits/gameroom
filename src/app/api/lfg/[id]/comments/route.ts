import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimitShared } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderate";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:lfg-comments");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimitShared(`lfg-comment:${user.id}`, 15, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { id: postId } = await params;
  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";

  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

  // Blocklist + toxicity gate before the comment is stored.
  const mod = await moderateText(text).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) {
    return NextResponse.json({ error: "content_blocked", reason: mod.reason }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: post, error: postError } = await supabase
    .from("lfg_posts")
    .select("id")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (postError) {
    logger.error("failed to load LFG post before comment", { postId, userId: user.id, error: postError });
    return NextResponse.json({ error: "database error" }, { status: 500 });
  }
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("lfg_comments")
    .insert({ post_id: postId, user_id: user.id, body: text })
    .select("id, body, created_at, user_id")
    .single();

  if (error) {
    logger.error("failed to insert LFG comment", { postId, userId: user.id, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
