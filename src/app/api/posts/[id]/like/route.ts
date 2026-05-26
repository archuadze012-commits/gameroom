import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { awardXp } from "@/lib/gamification";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("toggle_post_like_as", {
    p_user_id: user.id,
    p_post_id: id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If they just liked (data === true), award +1 XP to the post author
  if (data === true) {
    try {
      const { data: post } = await supabase
        .from("posts")
        .select("author_id")
        .eq("id", id)
        .maybeSingle();
      if (post?.author_id && post.author_id !== user.id) {
        await awardXp(post.author_id, 1);
      }
    } catch {}
  }

  return NextResponse.json({ liked: data });
}
