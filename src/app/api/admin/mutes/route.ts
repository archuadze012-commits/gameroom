import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission, logAdminAction } from "@/lib/admin";

export async function GET() {
  const auth = await requirePermission("manage_chat");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_mutes")
    .select("id, user_id, channel_id, reason, expires_at, created_at, profiles!user_mutes_user_id_fkey(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_chat");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : null;
  const channelId = typeof body.channelId === "string" ? body.channelId : null;
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : null;
  const minutes = typeof body.minutes === "number" ? body.minutes : null;

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const expires_at = minutes
    ? new Date(Date.now() + minutes * 60 * 1000).toISOString()
    : null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_mutes")
    .insert({ user_id: userId, channel_id: channelId, reason, muted_by: auth.userId, expires_at })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "mute_user",
    targetType: "profile",
    targetId: userId,
    metadata: { channelId, minutes, reason },
  });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission("manage_chat");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const muteId = request.nextUrl.searchParams.get("id");
  if (!muteId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("user_mutes").delete().eq("id", muteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "unmute_user",
    targetType: "mute",
    targetId: muteId,
  });
  return NextResponse.json({ ok: true });
}
