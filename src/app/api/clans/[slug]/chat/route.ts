import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimitShared } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderate";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:clan-chat");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimitShared(`clan-chat:${user.id}`, 25, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 500) : "";
  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  if (!clan) return NextResponse.json({ error: "clan_not_found" }, { status: 404 });

  // Membership gate (RLS is the backstop; this gives a clean error).
  const { data: membership } = await supabase
    .from("clan_members")
    .select("id")
    .eq("clan_id", clan.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "not_a_member" }, { status: 403 });

  // Blocklist + toxicity gate before the message is stored.
  const mod = await moderateText(text).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) {
    return NextResponse.json({ error: "content_blocked", reason: mod.reason }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("clan_messages")
    .insert({ clan_id: clan.id, user_id: user.id, body: text })
    .select(
      "id, user_id, body, created_at, profiles!clan_messages_user_id_fkey(username, display_name, avatar_url)"
    )
    .single();

  if (error) {
    logger.error("failed to insert clan chat message", { slug, userId: user.id, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
