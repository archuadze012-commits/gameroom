import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { content?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const content = (body.content ?? "").trim();
  if (!content || content.length > 2000)
    return NextResponse.json({ error: "Content must be 1–2000 chars" }, { status: 400 });

  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, content })
    .select("id, content, likes_count, created_at, profiles(username, display_name, avatar_url)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
