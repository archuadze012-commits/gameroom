import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { orderUsers } from "@/lib/dm";
import { rateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:lfg-queue");

// Join the matchmaking queue. Tries to match against an existing waiter
// for the same game immediately.
export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!rateLimit(`lfg-queue:${user.id}`, 20, 60_000))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const gameSlug = typeof body.gameSlug === "string" ? body.gameSlug.trim() : "";
  const region = typeof body.region === "string" ? body.region : null;
  const rankFilter = typeof body.rankFilter === "string" ? body.rankFilter : null;
  if (!gameSlug) return NextResponse.json({ error: "gameSlug required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  // Sweep expired entries for this game
  const { error: expireError } = await supabase
    .from("lfg_queue")
    .update({ status: "expired" })
    .eq("status", "searching")
    .eq("game_slug", gameSlug)
    .lt("expires_at", new Date().toISOString());
  if (expireError) {
    logger.error("failed to expire stale queue entries", { gameSlug, error: expireError });
    return NextResponse.json({ error: "queue_expire_failed" }, { status: 500 });
  }

  // Look for an existing searcher (oldest first), excluding self
  const { data: waiter, error: waiterError } = await supabase
    .from("lfg_queue")
    .select("id, user_id")
    .eq("status", "searching")
    .eq("game_slug", gameSlug)
    .neq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (waiterError) {
    logger.error("failed to find queue waiter", { userId: user.id, gameSlug, error: waiterError });
    return NextResponse.json({ error: "queue_lookup_failed" }, { status: 500 });
  }

  if (waiter) {
    // MATCH FOUND — create or reuse conversation, mark both as matched
    const ordered = orderUsers(user.id, waiter.user_id);

    // Find or create conversation
    const { data: existingConv, error: existingConvError } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", ordered.user_a)
      .eq("user_b", ordered.user_b)
      .maybeSingle();
    if (existingConvError) {
      logger.error("failed to lookup existing conversation", {
        userId: user.id,
        waiterId: waiter.user_id,
        error: existingConvError,
      });
      return NextResponse.json({ error: "conversation_lookup_failed" }, { status: 500 });
    }

    let convId: string;
    if (existingConv) {
      convId = existingConv.id;
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from("conversations")
        .insert(ordered)
        .select("id")
        .single();
      if (convErr || !newConv) {
        logger.error("failed to create LFG conversation", {
          userId: user.id,
          waiterId: waiter.user_id,
          error: convErr,
        });
        return NextResponse.json({ error: "conversation_create_failed" }, { status: 500 });
      }
      convId = newConv.id;
    }

    const matchedAt = new Date().toISOString();

    // Update the waiter's entry
    const { error: waiterUpdateError } = await supabase
      .from("lfg_queue")
      .update({
        status: "matched",
        matched_with: user.id,
        matched_conversation_id: convId,
        matched_at: matchedAt,
      })
      .eq("id", waiter.id);
    if (waiterUpdateError) {
      logger.error("failed to mark waiter as matched", {
        queueId: waiter.id,
        userId: waiter.user_id,
        error: waiterUpdateError,
      });
      return NextResponse.json({ error: "queue_match_failed" }, { status: 500 });
    }

    // Insert our entry as already-matched
    const { data: myEntry, error: myEntryError } = await supabase
      .from("lfg_queue")
      .insert({
        user_id: user.id,
        game_slug: gameSlug,
        region,
        rank_filter: rankFilter,
        status: "matched",
        matched_with: waiter.user_id,
        matched_conversation_id: convId,
        matched_at: matchedAt,
      })
      .select("id")
      .single();
    if (myEntryError || !myEntry) {
      logger.error("failed to insert matched queue entry", {
        userId: user.id,
        waiterId: waiter.user_id,
        conversationId: convId,
        error: myEntryError,
      });
      return NextResponse.json({ error: "queue_insert_failed" }, { status: 500 });
    }

    // Send a kickoff system message into the conversation
    try {
      const { data: meProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .maybeSingle();
      const name = meProfile?.display_name ?? meProfile?.username ?? "გეიმერი";
      const { error: messageError } = await supabase.from("conversation_messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        body: `🎮 ${name}-მ Smart ლოკალით გიპოვა ${gameSlug}-ისთვის. წავიდეთ?`,
      });
      if (messageError) {
        logger.warn("failed to write LFG kickoff message", {
          conversationId: convId,
          senderId: user.id,
          error: messageError,
        });
      }
    } catch (error) {
      logger.warn("LFG kickoff message flow threw", { conversationId: convId, error });
    }

    // Push notification to the other user
    try {
      const { sendPushToUser } = await import("@/lib/push");
      await sendPushToUser(waiter.user_id, {
        title: "Match იპოვა! 🎮",
        body: `${gameSlug}-ში პარტნიორი გელოდება`,
        url: `/messages/${convId}`,
        tag: `lfg-match-${convId}`,
      });
    } catch (error) {
      logger.warn("failed to send LFG match push", {
        recipientId: waiter.user_id,
        conversationId: convId,
        error,
      });
    }

    return NextResponse.json({
      status: "matched",
      conversationId: convId,
      queueId: myEntry?.id,
    });
  }

  // No waiter — add ourselves to queue
  const { data: entry, error } = await supabase
    .from("lfg_queue")
    .insert({
      user_id: user.id,
      game_slug: gameSlug,
      region,
      rank_filter: rankFilter,
      status: "searching",
    })
    .select("id")
    .single();

  if (error || !entry) {
    // Conflict — already searching for this game
    if (error?.code === "23505") {
      return NextResponse.json({ error: "already_searching" }, { status: 409 });
    }
    logger.error("failed to insert searching queue entry", { userId: user.id, gameSlug, error });
    return NextResponse.json({ error: "queue_insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "searching", queueId: entry.id });
}

// Leave the queue
export async function DELETE(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const queueId = request.nextUrl.searchParams.get("id");
  const supabase = await createSupabaseServerClient();

  const q = supabase
    .from("lfg_queue")
    .update({ status: "cancelled" }, { count: "exact" })
    .eq("user_id", user.id)
    .eq("status", "searching");
  let result: Awaited<typeof q>;
  if (queueId) {
    result = await q.eq("id", queueId);
  } else {
    result = await q;
  }

  if (result.error) {
    logger.error("failed to cancel queue entry", { userId: user.id, queueId, error: result.error });
    return NextResponse.json({ error: "queue_cancel_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cancelled: (result.count ?? 0) > 0 });
}
