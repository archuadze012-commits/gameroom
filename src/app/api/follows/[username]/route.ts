import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ResolveResult =
  | { ok: true; followerId: string; followingId: string }
  | { ok: false; status: 401 | 404 | 400; error: string };

async function resolveIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  username: string,
): Promise<ResolveResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "unauthorized" };
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();
  if (!target) return { ok: false, status: 404, error: "user not found" };
  if (target.id === user.id) return { ok: false, status: 400, error: "cannot follow yourself" };
  return { ok: true, followerId: user.id, followingId: target.id };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const ids = await resolveIds(supabase, username);
  if (!ids.ok) return NextResponse.json({ error: ids.error }, { status: ids.status });

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
  if (!ids.ok) return NextResponse.json({ error: ids.error }, { status: ids.status });

  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", ids.followerId)
    .eq("following_id", ids.followingId);

  return NextResponse.json({ following: false });
}
