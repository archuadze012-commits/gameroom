import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const { data: post } = await supabase
    .from("lfg_posts")
    .select("id, author_id, title")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (post.author_id === user.id)
    return NextResponse.json({ error: "cannot join your own post" }, { status: 400 });

  const { error } = await supabase
    .from("lfg_responses")
    .insert({ post_id: postId, user_id: user.id, message, status: "pending" });

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "already_requested" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: joinerProfile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const joinerName =
    joinerProfile?.display_name ?? joinerProfile?.username ?? "მომხმარებელი";

  await supabase.from("notifications").insert({
    user_id: post.author_id,
    type: "lfg_response",
    title: "გუნდში შეერთების მოთხოვნა",
    body: `${joinerName}-მ მოითხოვა შეერთება — "${post.title}"`,
    link: `/lfg/${postId}`,
  });

  return NextResponse.json({ ok: true });
}
