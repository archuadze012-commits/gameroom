import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:lfg-queue-status");

// Poll the current user's most recent queue entry for a given game.
export async function GET(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const gameSlug = request.nextUrl.searchParams.get("gameSlug");
  if (!gameSlug) return NextResponse.json({ error: "gameSlug required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  // Expire stale entries
  const { error: expireError } = await supabase
    .from("lfg_queue")
    .update({ status: "expired" })
    .eq("user_id", user.id)
    .eq("game_slug", gameSlug)
    .eq("status", "searching")
    .lt("expires_at", new Date().toISOString());
  if (expireError) {
    logger.error("failed to expire user queue entries", { userId: user.id, gameSlug, error: expireError });
    return NextResponse.json({ error: "queue_expire_failed" }, { status: 500 });
  }

  const { data: entry, error: entryError } = await supabase
    .from("lfg_queue")
    .select("id, status, matched_with, matched_conversation_id, created_at, expires_at")
    .eq("user_id", user.id)
    .eq("game_slug", gameSlug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (entryError) {
    logger.error("failed to load latest queue entry", { userId: user.id, gameSlug, error: entryError });
    return NextResponse.json({ error: "queue_lookup_failed" }, { status: 500 });
  }

  if (!entry) return NextResponse.json({ status: "none" });

  // If matched, attach the other user's profile
  let partner = null;
  if (entry.status === "matched" && entry.matched_with) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url, is_verified")
      .eq("id", entry.matched_with)
      .maybeSingle();
    if (profileError) {
      logger.warn("failed to load matched partner profile", {
        userId: user.id,
        partnerId: entry.matched_with,
        error: profileError,
      });
    }
    partner = profile;
  }

  return NextResponse.json({
    status: entry.status,
    queueId: entry.id,
    conversationId: entry.matched_conversation_id,
    createdAt: entry.created_at,
    expiresAt: entry.expires_at,
    partner,
  });
}
