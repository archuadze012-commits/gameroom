import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:lfg-join");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";

  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  const { data: post, error: postError } = await supabase
    .from("lfg_posts")
    .select("id, author_id")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (postError) {
    logger.error("failed to load LFG post before join", { postId, userId: user.id, error: postError });
    return NextResponse.json({ error: "database error" }, { status: 500 });
  }
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (post.author_id === user.id)
    return NextResponse.json({ error: "cannot join your own post" }, { status: 400 });

  const { error } = await supabase
    .from("lfg_responses")
    .insert({ post_id: postId, user_id: user.id, message, status: "pending" });

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "already_requested" }, { status: 409 });
    logger.error("failed to insert LFG join response", { postId, userId: user.id, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const senderName = senderProfile?.display_name ?? senderProfile?.username ?? "ვინმე";

  sendPushToUser(post.author_id, {
    title: "ახალი ლოკალის მოთხოვნა 🎮",
    body: `${senderName}: ${message.slice(0, 80)}`,
    url: `/lfg/${postId}`,
    tag: `lfg-join-${postId}`,
  }).catch((error) => {
    logger.warn("failed to send LFG join push", { postId, recipientId: post.author_id, error });
  });

  return NextResponse.json({ ok: true });
}
