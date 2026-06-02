import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const type = req.nextUrl.searchParams.get("type") === "followers" ? "followers" : "following";

  const supabase = await createSupabaseServerClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (type === "followers") {
    const { data, error } = await supabase
      .from("follows")
      .select("profiles!follows_follower_id_profiles_id_fk(id, username, display_name, avatar_url)")
      .eq("following_id", target.id)
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const users = (data ?? []).map((row) => row.profiles).filter(Boolean);
    return NextResponse.json(users);
  } else {
    const { data, error } = await supabase
      .from("follows")
      .select("profiles!follows_following_id_profiles_id_fk(id, username, display_name, avatar_url)")
      .eq("follower_id", target.id)
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const users = (data ?? []).map((row) => row.profiles).filter(Boolean);
    return NextResponse.json(users);
  }
}
