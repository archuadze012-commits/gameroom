import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { rateLimitShared } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderate";
import { createLogger } from "@/lib/logger";
import { PROFILE_BIO_MAX_LENGTH, PROFILE_MEDIUM_TEXT_MAX_LENGTH, PROFILE_SHORT_TEXT_MAX_LENGTH } from "@/lib/constants";
import type { Database } from "@/lib/database.types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
const logger = createLogger("api:profile");

// Display name may only change once per cooldown window — prevents rapid
// identity-cycling (impersonation, evading mutes/blocks). Username is not
// editable through this endpoint at all: it's the permanent profile URL slug,
// fixed at signup.
const DISPLAY_NAME_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

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
  if (typeof body.displayName === "string")
    update.display_name = body.displayName.trim().slice(0, PROFILE_MEDIUM_TEXT_MAX_LENGTH) || null;
  if (typeof body.bio === "string")
    update.bio = body.bio.trim().slice(0, PROFILE_BIO_MAX_LENGTH) || null;
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

  // Moderate the free-text profile fields — these render publicly across the
  // site (profile page, /api/users search), so they get the same gate as
  // posts/LFG/chat/comments, which the profile route previously skipped.
  const profileText = [update.display_name, update.bio, update.in_game_name]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(" ");
  if (profileText) {
    const mod = await moderateText(profileText).catch(() => ({
      ok: true,
      reason: undefined as string | undefined,
    }));
    if (!mod.ok) {
      return NextResponse.json({ error: "content_blocked", reason: mod.reason }, { status: 400 });
    }
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (typeof update.display_name !== "undefined") {
      const { data: current } = await supabase
        .from("profiles")
        .select("display_name, display_name_changed_at")
        .eq("id", user.id)
        .single();

      // Cooldown is enforced (and display_name_changed_at is stamped) by the
      // trg_display_name_cooldown BEFORE UPDATE trigger — that column has no
      // authenticated UPDATE grant on purpose, so the app must not write it.
      // This pre-check only exists to return a friendly localized 429 with the
      // next-eligible date instead of surfacing the trigger's raw exception.
      if ((current?.display_name ?? null) !== update.display_name) {
        const lastChangedAt = current?.display_name_changed_at
          ? new Date(current.display_name_changed_at).getTime()
          : null;
        const elapsed = lastChangedAt !== null ? Date.now() - lastChangedAt : Infinity;
        if (elapsed < DISPLAY_NAME_COOLDOWN_MS) {
          return NextResponse.json(
            {
              error: "display_name_cooldown",
              nextChangeAt: new Date(lastChangedAt! + DISPLAY_NAME_COOLDOWN_MS).toISOString(),
            },
            { status: 429 }
          );
        }
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error("failed to update profile", { userId: user.id, error: e });
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
