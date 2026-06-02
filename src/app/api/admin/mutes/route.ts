import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { logAdminAction, requirePermission } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DeleteMutePayload = {
  id?: string;
};

export async function GET(request: NextRequest) {
  const auth = await requirePermission("manage_chat");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const status = request.nextUrl.searchParams.get("status") ?? "active";
  const nowIso = new Date().toISOString();

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("user_mutes")
    .select(`
      id,
      channel_id,
      reason,
      created_at,
      expires_at,
      profiles!user_mutes_user_id_profiles_id_fk(id, username, display_name, avatar_url),
      muted_by_profile:profiles!user_mutes_muted_by_profiles_id_fk(username, display_name)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status === "active") {
    query = query.or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).map((row) => ({
    id: row.id,
    channelId: row.channel_id,
    reason: row.reason,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    user: {
      id: row.profiles?.id ?? "",
      username: row.profiles?.username ?? "",
      displayName: row.profiles?.display_name ?? null,
      avatarUrl: row.profiles?.avatar_url ?? null,
    },
    mutedBy: {
      username: row.muted_by_profile?.username ?? "",
      displayName: row.muted_by_profile?.display_name ?? null,
    },
  }));

  return NextResponse.json(rows);
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission("manage_chat");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const parsed = await readJsonObject<DeleteMutePayload>(request);
  if (!parsed.ok) return parsed.response;

  const id = typeof parsed.data.id === "string" ? parsed.data.id : "";
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("user_mutes")
    .select("id, user_id, channel_id")
    .eq("id", id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await supabase.from("user_mutes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "unmute_user",
    targetType: "profile",
    targetId: existing.user_id,
    metadata: { channelId: existing.channel_id, muteId: existing.id },
  });

  return NextResponse.json({ ok: true });
}
