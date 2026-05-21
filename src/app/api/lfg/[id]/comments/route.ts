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
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";

  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  const { data: post } = await supabase
    .from("lfg_posts")
    .select("id")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("lfg_comments")
    .insert({ post_id: postId, user_id: user.id, body: text })
    .select("id, body, created_at, user_id")
    .single();

  if (error) {
    console.error("[POST /api/lfg/[id]/comments]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
