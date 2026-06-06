import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:forum-post-like");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("forum_likes")
    .insert({ post_id: postId, user_id: user.id });

  if (error) {
    if (error.code === "23505") {
      // Unique violation / already liked
      return NextResponse.json({ ok: true });
    }
    logger.error("failed to like forum post", { postId, userId: user.id, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("forum_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id);

  if (error) {
    logger.error("failed to unlike forum post", { postId, userId: user.id, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
