import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Verify participant
  const { data: conv } = await supabase
    .from("conversations")
    .select("user_a, user_b")
    .eq("id", id)
    .maybeSingle();

  if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark unread messages addressed to current user as read
  await supabase
    .from("conversation_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .neq("sender_id", user.id)
    .is("read_at", null);

  return NextResponse.json(data ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  // Verify participant + get other user id (for push notification)
  const { data: conv } = await supabase
    .from("conversations")
    .select("user_a, user_b")
    .eq("id", id)
    .maybeSingle();

  if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const recipientId = conv.user_a === user.id ? conv.user_b : conv.user_a;

  const { data, error } = await supabase
    .from("conversation_messages")
    .insert({ conversation_id: id, sender_id: user.id, body: text })
    .select("id, sender_id, body, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // bump conversation
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", id);

  // Fire push (best-effort, don't block response)
  try {
    const { sendPushToUser } = await import("@/lib/push");
    const { data: sender } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .maybeSingle();
    const name = sender?.display_name ?? sender?.username ?? "ვინმე";
    await sendPushToUser(recipientId, {
      title: `${name}-მ მოგწერა`,
      body: text.slice(0, 100),
      url: `/messages/${id}`,
      tag: `dm-${id}`,
    });
  } catch {}

  return NextResponse.json(data);
}
