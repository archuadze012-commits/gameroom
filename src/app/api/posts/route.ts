import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { content?: string; mediaUrls?: string[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const content = (body.content ?? "").trim();
  if (!content || content.length > 2000)
    return NextResponse.json({ error: "Content must be 1–2000 chars" }, { status: 400 });

  const mediaUrls = Array.isArray(body.mediaUrls)
    ? body.mediaUrls.filter((u): u is string => typeof u === "string").slice(0, 4)
    : [];

  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, content, media_urls: mediaUrls })
    .select("id, content, media_urls, likes_count, created_at, profiles!posts_author_id_fkey(username, display_name, avatar_url, is_verified, role)")
    .single();

  if (error) {
    console.error("[/api/posts] insert failed:", error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  // award XP for posting
  try {
    await supabase.rpc("award_xp", { p_user_id: user.id, p_amount: 10 });
  } catch {}

  return NextResponse.json(data, { status: 201 });
}
