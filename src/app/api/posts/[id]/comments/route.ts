import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("post_comments")
    .select("id, body, created_at, profiles!post_comments_author_id_fkey(username, display_name, avatar_url, is_verified)")
    .eq("post_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { body?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const text = (body.body ?? "").trim();
  if (!text || text.length > 1000)
    return NextResponse.json({ error: "Comment must be 1–1000 chars" }, { status: 400 });

  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: id, author_id: user.id, body: text })
    .select("id, body, created_at, profiles!post_comments_author_id_fkey(username, display_name, avatar_url, is_verified)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
