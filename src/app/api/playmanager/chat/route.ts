import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission, logAdminAction } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderate";

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
  // canManageChat lets the client render moderator affordances (delete-any,
  // mute). Everyone can delete their OWN message and report others regardless.
  const canManageChat = await hasPermission("manage_chat").catch(() => false);
  return NextResponse.json({ messages: data ?? [], canManageChat });
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

  // Block muted users (a mute on this channel, or a global channel_id=null mute)
  // before anything reaches the feed — mirrors the pubg-mobile chat gate.
  const { data: mutes } = await supabase
    .from("user_mutes")
    .select("expires_at")
    .eq("user_id", user.id)
    .or(`channel_id.eq.${CHANNEL_ID},channel_id.is.null`);
  const muted = (mutes ?? []).some(
    (m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now(),
  );
  if (muted) return NextResponse.json({ error: "user_muted" }, { status: 403 });

  // Blocklist + toxicity moderation — same stack as LFG creation / global chat.
  // moderateText fails open (returns ok) when GROQ_API_KEY is unset or on error.
  const moderation = await moderateText(text).catch(() => ({ ok: true as const }));
  if (!moderation.ok) {
    return NextResponse.json(
      { error: "content_blocked", reason: (moderation as { reason?: string }).reason },
      { status: 400 },
    );
  }

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

// Soft-delete a global-chat message. Authors can remove their own; holders of
// `manage_chat` can remove anyone's. Deletion sets deleted_at so GET (which
// filters `deleted_at is null`) and every client drops it.
export async function DELETE(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`playmanager-chat-delete:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: message } = await supabase
    .from("chat_messages")
    .select("id, author_id, channel_id, deleted_at")
    .eq("id", id)
    .eq("channel_id", CHANNEL_ID)
    .maybeSingle();

  if (!message) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (message.deleted_at) return NextResponse.json({ ok: true }); // already gone

  const isOwner = message.author_id === user.id;
  const canManage = isOwner ? false : await hasPermission("manage_chat").catch(() => false);
  if (!isOwner && !canManage) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Moderators may need to remove a message they can't see under RLS write
  // rules, so the actual write goes through the admin client. Ownership /
  // permission was already proven above.
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("chat_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit-log moderator deletions of other people's messages.
  if (!isOwner) {
    await logAdminAction({
      actorId: user.id,
      action: "delete_chat_message",
      targetType: "message",
      targetId: id,
      metadata: { channelId: CHANNEL_ID, authorId: message.author_id },
    });
  }

  return NextResponse.json({ ok: true });
}
