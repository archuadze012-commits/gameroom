import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { rateLimitShared } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { PROFILE_MEDIUM_TEXT_MAX_LENGTH, PROFILE_SHORT_TEXT_MAX_LENGTH } from "@/lib/constants";
import type { Database } from "@/lib/database.types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
const logger = createLogger("api:profile");

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimitShared(`profile-update:${user.id}`, 20, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const update: ProfileUpdate = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.username === "string" && body.username.trim())
    update.username = body.username.trim().slice(0, PROFILE_SHORT_TEXT_MAX_LENGTH);
  if (typeof body.displayName === "string")
    update.display_name = body.displayName.trim().slice(0, PROFILE_MEDIUM_TEXT_MAX_LENGTH) || null;
  if (typeof body.bio === "string")
    update.bio = body.bio.trim() || null;
  if (typeof body.region === "string")
    update.region = body.region.trim() || null;
  if (typeof body.voiceChat === "boolean")
    update.voice_chat = body.voiceChat;
  if (typeof body.dmPrivacy === "string" && ["everyone", "followers", "nobody"].includes(body.dmPrivacy))
    update.dm_privacy = body.dmPrivacy;
  if (Array.isArray(body.favoriteGameSlugs)) {
    const favoriteSlugs = (body.favoriteGameSlugs as unknown[]).filter((s): s is string => typeof s === "string");
    const mainGameSlug = typeof body.mainGameSlug === "string" ? body.mainGameSlug.trim() : "";
    update.favorite_game_slugs = Array.from(new Set([...(mainGameSlug ? [mainGameSlug] : []), ...favoriteSlugs]));
  }
  if (typeof body.youtubeHandle === "string")
    update.youtube_handle = body.youtubeHandle.trim().replace(/^@/, "").slice(0, PROFILE_MEDIUM_TEXT_MAX_LENGTH) || null;
  if (typeof body.tiktokHandle === "string")
    update.tiktok_handle = body.tiktokHandle.trim().replace(/^@/, "").slice(0, PROFILE_MEDIUM_TEXT_MAX_LENGTH) || null;
  if (typeof body.tiktokFollowers === "string")
    update.tiktok_followers = body.tiktokFollowers.trim().slice(0, PROFILE_SHORT_TEXT_MAX_LENGTH) || null;
  if (typeof body.inGameName === "string")
    update.in_game_name = body.inGameName.trim().slice(0, PROFILE_MEDIUM_TEXT_MAX_LENGTH) || null;
  if (typeof body.gameId === "string")
    update.game_id = body.gameId.trim().slice(0, PROFILE_MEDIUM_TEXT_MAX_LENGTH) || null;
  if (typeof body.mainGameSlug === "string")
    update.main_game_slug = body.mainGameSlug.trim() || null;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id);
    if (error) {
      if (error.code === "23505")
        return NextResponse.json({ error: "username_taken" }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("failed to update profile", { userId: user.id, error: e });
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
