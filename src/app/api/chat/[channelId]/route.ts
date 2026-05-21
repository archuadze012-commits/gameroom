import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, body, created_at, author_id, profiles!chat_messages_author_id_fkey(username, display_name, avatar_url, role, is_verified)")
      .eq("channel_id", channelId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[GET /api/chat/[channelId]]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const session = await getSession().catch(() => null);
  if (!session?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const text = typeof (body as { body?: unknown })?.body === "string"
    ? ((body as { body: string }).body).trim()
    : "";

  if (!text || text.length > 2000) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();

    // Check mutes
    const now = new Date().toISOString();
    const { data: mutes } = await supabase
      .from("user_mutes")
      .select("id, channel_id, expires_at")
      .eq("user_id", session.id);
    const activeMutes = (mutes ?? []).filter((m) => !m.expires_at || m.expires_at > now);
    const isGlobalMuted = activeMutes.some((m) => m.channel_id === null);
    const isChannelMuted = activeMutes.some((m) => m.channel_id === channelId);
    if (isGlobalMuted || isChannelMuted) {
      return NextResponse.json({ error: "muted" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        channel_id: channelId,
        author_id: session.id,
        body: text,
      })
      .select("id, body, created_at, author_id, profiles!chat_messages_author_id_fkey(username, display_name, avatar_url, role, is_verified)")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    console.error("[POST /api/chat/[channelId]]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
