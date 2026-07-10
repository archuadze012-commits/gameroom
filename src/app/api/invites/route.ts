import { NextRequest, NextResponse } from "next/server";

import { requireRateLimitedUser } from "@/lib/api/guards";
import { readJsonObject } from "@/lib/api/json";
import { isBlocked } from "@/lib/blocks";
import { buildGameInviteNotification } from "@/lib/critical-workflows";
import { createLogger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const logger = createLogger("api:invites");

export async function POST(request: NextRequest) {
  const guard = await requireRateLimitedUser(request, "game-invite", 10, 60_000);
  if (!guard.ok) return guard.response;

  const parsed = await readJsonObject<{ username?: string; gameSlug?: string }>(request, 2 * 1024);
  if (!parsed.ok) return parsed.response;

  const username = parsed.data.username?.trim().toLowerCase() ?? "";
  const gameSlug = parsed.data.gameSlug?.trim().toLowerCase() ?? "";
  if (!username || !gameSlug) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const [{ data: sender }, { data: recipient }, { data: game }] = await Promise.all([
    admin.from("profiles").select("username, display_name").eq("id", guard.userId).maybeSingle(),
    admin.from("profiles").select("id, username").eq("username", username).eq("banned", false).maybeSingle(),
    admin.from("games").select("slug, name_ka").eq("slug", gameSlug).eq("active", true).maybeSingle(),
  ]);

  if (!sender?.username) return NextResponse.json({ error: "sender_profile_missing" }, { status: 409 });
  if (!recipient) return NextResponse.json({ error: "recipient_not_found" }, { status: 404 });
  if (!game) return NextResponse.json({ error: "game_not_found" }, { status: 404 });
  if (recipient.id === guard.userId) return NextResponse.json({ error: "cannot_invite_self" }, { status: 400 });
  try {
    if (await isBlocked(guard.userId, recipient.id)) {
      return NextResponse.json({ error: "blocked" }, { status: 403 });
    }
  } catch (error) {
    logger.error("failed to check invite block boundary", {
      senderId: guard.userId,
      recipientId: recipient.id,
      error,
    });
    return NextResponse.json({ error: "block_check_failed" }, { status: 503 });
  }

  const notification = buildGameInviteNotification({
    senderDisplayName: sender.display_name || sender.username,
    senderUsername: sender.username,
    gameName: game.name_ka,
    gameSlug: game.slug,
  });

  const { error } = await admin.from("notifications").insert({
    user_id: recipient.id,
    ...notification,
  });
  if (error) {
    logger.error("failed to create game invite", {
      senderId: guard.userId,
      recipientId: recipient.id,
      gameSlug,
      error,
    });
    return NextResponse.json({ error: "invite_failed" }, { status: 500 });
  }

  await sendPushToUser(recipient.id, {
    title: notification.title,
    body: notification.body,
    url: notification.link,
    tag: `game-invite-${guard.userId}-${game.slug}`,
  }).catch((error) => {
    logger.warn("failed to send game invite push", { recipientId: recipient.id, error });
  });

  return NextResponse.json({ ok: true });
}
