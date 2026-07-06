import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimitShared } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderate";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:room-chat");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimitShared(`room-chat:${user.id}`, 25, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { roomId } = await params;
  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 500) : "";

  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

  // Blocklist + toxicity gate before the message is stored.
  const mod = await moderateText(text).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) {
    return NextResponse.json({ error: "content_blocked", reason: mod.reason }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("room_chat_messages")
    .insert({ room_id: roomId, user_id: user.id, body: text })
    .select(
      "id, user_id, body, created_at, profiles!room_chat_messages_user_id_fkey(username, display_name, avatar_url)"
    )
    .single();

  if (error) {
    logger.error("failed to insert room chat message", { roomId, userId: user.id, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
