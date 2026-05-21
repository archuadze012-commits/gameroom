import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

// Poll the current user's most recent queue entry for a given game.
export async function GET(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const gameSlug = request.nextUrl.searchParams.get("gameSlug");
  if (!gameSlug) return NextResponse.json({ error: "gameSlug required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  // Expire stale entries
  await supabase
    .from("lfg_queue")
    .update({ status: "expired" })
    .eq("user_id", user.id)
    .eq("game_slug", gameSlug)
    .eq("status", "searching")
    .lt("expires_at", new Date().toISOString());

  const { data: entry } = await supabase
    .from("lfg_queue")
    .select("id, status, matched_with, matched_conversation_id, created_at, expires_at")
    .eq("user_id", user.id)
    .eq("game_slug", gameSlug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!entry) return NextResponse.json({ status: "none" });

  // If matched, attach the other user's profile
  let partner = null;
  if (entry.status === "matched" && entry.matched_with) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url, is_verified")
      .eq("id", entry.matched_with)
      .maybeSingle();
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
