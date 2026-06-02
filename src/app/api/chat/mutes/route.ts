import { NextResponse } from "next/server";
import { logAdminAction, requirePermission } from "@/lib/admin";
import { readJsonObject } from "@/lib/api/json";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MutePayload = {
  channelId?: string;
  username?: string;
  displayName?: string;
  durationKey?: "15m" | "1h" | "1d" | "1w" | "permanent";
};

const MUTE_DURATIONS = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  permanent: null,
} as const;

const DEFAULT_MUTE_KEY: keyof typeof MUTE_DURATIONS = "1d";

function getActiveMute(rows: Array<{ id: string; expires_at: string | null }>) {
  const now = Date.now();
  return rows.find((row) => !row.expires_at || new Date(row.expires_at).getTime() > now);
}

export async function POST(request: Request) {
  const auth = await requirePermission("manage_chat");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const parsed = await readJsonObject<MutePayload>(request);
  if (!parsed.ok) return parsed.response;

  const channelId = typeof parsed.data.channelId === "string" ? parsed.data.channelId.trim() : "";
  const username = typeof parsed.data.username === "string" ? parsed.data.username.trim() : "";
  const displayName = typeof parsed.data.displayName === "string" ? parsed.data.displayName.trim() : "";
  const durationKey =
    parsed.data.durationKey && parsed.data.durationKey in MUTE_DURATIONS
      ? parsed.data.durationKey
      : DEFAULT_MUTE_KEY;

  if (!channelId || (!username && !displayName)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();

    let profile: { id: string; username: string; display_name: string | null } | null = null;

    if (username) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .ilike("username", username)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      profile = data;
    }

    if (!profile && displayName) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .ilike("display_name", displayName)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      profile = data;
    }

    if (!profile) {
      return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    }

    if (profile.id === auth.userId) {
      return NextResponse.json({ error: "cannot_mute_self" }, { status: 400 });
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("user_mutes")
      .select("id, expires_at")
      .eq("user_id", profile.id)
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (existingError) throw existingError;

    const activeMute = getActiveMute(existingRows ?? []);
    const expiresAt =
      MUTE_DURATIONS[durationKey] === null
        ? null
        : new Date(Date.now() + MUTE_DURATIONS[durationKey]).toISOString();

    let alreadyMuted = false;
    if (activeMute) {
      alreadyMuted = true;
      const { error: updateError } = await supabase
        .from("user_mutes")
        .update({
          muted_by: auth.userId,
          expires_at: expiresAt,
          reason: "PUBG Mobile chat mute",
        })
        .eq("id", activeMute.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("user_mutes").insert({
        user_id: profile.id,
        channel_id: channelId,
        muted_by: auth.userId,
        expires_at: expiresAt,
        reason: "PUBG Mobile chat mute",
      });

      if (insertError) throw insertError;
    }

    await logAdminAction({
      actorId: auth.userId,
      action: alreadyMuted ? "mute_user_updated" : "mute_user",
      targetType: "profile",
      targetId: profile.id,
      metadata: {
        channelId,
        durationKey,
        username: profile.username,
      },
    });

    return NextResponse.json({ ok: true, expiresAt, alreadyMuted, durationKey });
  } catch (error) {
    console.error("[/api/chat/mutes POST]", error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
