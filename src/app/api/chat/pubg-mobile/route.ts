import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/admin";
import { getSession } from "@/lib/auth";
import { createChatCursor, normalizeChatBody, parseChatCursor, type ChatCursor } from "@/lib/critical-workflows";
import { moderateText } from "@/lib/moderate";
import { rateLimitShared } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CHANNEL_ID = "pubg";

type ChatProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ChatRow = {
  id: string;
  author_id: string;
  body: string;
  created_at: string | null;
  profiles: ChatProfile | ChatProfile[] | null;
};

function toMessage(row: ChatRow, currentUserId: string | null) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    author: profile?.display_name || profile?.username || "მომხმარებელი",
    authorUsername: profile?.username || "user",
    avatarUrl: profile?.avatar_url ?? null,
    body: row.body,
    createdAt: row.created_at ?? new Date().toISOString(),
    isMine: row.author_id === currentUserId,
  };
}

async function selectMessages(currentUserId: string | null, cursor: ChatCursor | null) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("chat_messages")
    .select("id, author_id, body, created_at, profiles!chat_messages_author_id_profiles_id_fk(username, display_name, avatar_url)")
    .eq("channel_id", CHANNEL_ID)
    .is("deleted_at", null);
  if (cursor) {
    query = query
      .or(`created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(150);
  } else {
    query = query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(150);
  }
  const { data, error } = await query;
  if (error) return { messages: null, nextCursor: null, error };
  const rows = (data ?? []) as unknown as ChatRow[];
  if (!cursor) rows.reverse();
  const newest = rows.at(-1);
  return {
    messages: rows.map((row) => toMessage(row, currentUserId)),
    nextCursor: newest?.created_at ? createChatCursor({ createdAt: newest.created_at, id: newest.id }) : cursor ? createChatCursor(cursor) : null,
    error: null,
  };
}

export async function GET(request: NextRequest) {
  const user = await getSession().catch(() => null);
  const cursor = parseChatCursor(request.nextUrl.searchParams.get("cursor"));
  const result = await selectMessages(user?.id ?? null, cursor);
  if (result.error) return NextResponse.json({ error: "chat_fetch_failed" }, { status: 500 });
  const canManageChat = user ? await hasPermission("manage_chat").catch(() => false) : false;
  return NextResponse.json({ messages: result.messages, nextCursor: result.nextCursor, canManageChat });
}

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await rateLimitShared(`pubg-chat:${user.id}`, 25, 60_000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const payload = await request.json().catch(() => null);
  const normalized = normalizeChatBody(payload?.body);
  if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const [{ data: mutes, error: muteError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from("user_mutes")
      .select("expires_at")
      .eq("user_id", user.id)
      .or(`channel_id.eq.${CHANNEL_ID},channel_id.is.null`),
    supabase.from("profiles").select("banned").eq("id", user.id).maybeSingle(),
  ]);
  if (muteError || profileError) {
    return NextResponse.json({ error: "chat_boundary_check_failed" }, { status: 503 });
  }
  if (!profile || profile.banned) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const muted = (mutes ?? []).some(
    (mute) => !mute.expires_at || new Date(mute.expires_at).getTime() > Date.now(),
  );
  if (muted) return NextResponse.json({ error: "user_muted" }, { status: 403 });

  const moderation = await moderateText(normalized.body);
  if (!moderation.ok) {
    return NextResponse.json({ error: "content_blocked", reason: moderation.reason }, { status: 400 });
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("chat_messages")
    .insert({ channel_id: CHANNEL_ID, author_id: user.id, body: normalized.body })
    .select("id, author_id, body, created_at, profiles!chat_messages_author_id_profiles_id_fk(username, display_name, avatar_url)")
    .single();
  if (error || !data) return NextResponse.json({ error: "chat_send_failed" }, { status: 500 });
  return NextResponse.json(toMessage(data as unknown as ChatRow, user.id));
}
