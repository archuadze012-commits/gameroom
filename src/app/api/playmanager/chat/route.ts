import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const CHANNEL_ID = "playmanager_global";

export async function GET() {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select(
      "id, author_id, body, created_at, profiles!chat_messages_author_id_profiles_id_fk(username, display_name, avatar_url)"
    )
    .eq("channel_id", CHANNEL_ID)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(150);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`playmanager-chat:${user.id}`, 25, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return NextResponse.json({ error: "empty_message" }, { status: 400 });
  if (text.length > 500) return NextResponse.json({ error: "message_too_long" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      channel_id: CHANNEL_ID,
      author_id: user.id,
      body: text,
    })
    .select(
      "id, author_id, body, created_at, profiles!chat_messages_author_id_profiles_id_fk(username, display_name, avatar_url)"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
