import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function resolveIds(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, username: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();
  if (!target) return null;
  return { followerId: user.id, followingId: target.id };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const ids = await resolveIds(supabase, username);
  if (!ids) return NextResponse.json({ error: "Unauthorized or user not found" }, { status: 401 });

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: ids.followerId, following_id: ids.followingId });

  if (error && error.code !== "23505") // ignore duplicate
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ following: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const ids = await resolveIds(supabase, username);
  if (!ids) return NextResponse.json({ error: "Unauthorized or user not found" }, { status: 401 });

  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", ids.followerId)
    .eq("following_id", ids.followingId);

  return NextResponse.json({ following: false });
}
