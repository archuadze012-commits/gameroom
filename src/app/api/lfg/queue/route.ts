import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { orderUsers } from "@/lib/dm";

// Join the matchmaking queue. Tries to match against an existing waiter
// for the same game immediately.
export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const gameSlug = typeof body.gameSlug === "string" ? body.gameSlug.trim() : "";
  const region = typeof body.region === "string" ? body.region : null;
  const rankFilter = typeof body.rankFilter === "string" ? body.rankFilter : null;
  if (!gameSlug) return NextResponse.json({ error: "gameSlug required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();

  // Sweep expired entries for this game
  await supabase
    .from("lfg_queue")
    .update({ status: "expired" })
    .eq("status", "searching")
    .eq("game_slug", gameSlug)
    .lt("expires_at", new Date().toISOString());

  // Look for an existing searcher (oldest first), excluding self
  const { data: waiter } = await supabase
    .from("lfg_queue")
    .select("id, user_id")
    .eq("status", "searching")
    .eq("game_slug", gameSlug)
    .neq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (waiter) {
    // MATCH FOUND — create or reuse conversation, mark both as matched
    const ordered = orderUsers(user.id, waiter.user_id);

    // Find or create conversation
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_a", ordered.user_a)
      .eq("user_b", ordered.user_b)
      .maybeSingle();

    let convId: string;
    if (existingConv) {
      convId = existingConv.id;
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from("conversations")
        .insert(ordered)
        .select("id")
        .single();
      if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });
      convId = newConv.id;
    }

    const matchedAt = new Date().toISOString();

    // Update the waiter's entry
    await supabase
      .from("lfg_queue")
      .update({
        status: "matched",
        matched_with: user.id,
        matched_conversation_id: convId,
        matched_at: matchedAt,
      })
      .eq("id", waiter.id);

    // Insert our entry as already-matched
    const { data: myEntry } = await supabase
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

    // Send a kickoff system message into the conversation
    try {
      const { data: meProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .maybeSingle();
      const name = meProfile?.display_name ?? meProfile?.username ?? "გეიმერი";
      await supabase.from("conversation_messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        body: `🎮 ${name}-მ Smart ლოკალით გიპოვა ${gameSlug}-ისთვის. წავიდეთ?`,
      });
    } catch {}

    // Push notification to the other user
    try {
      const { sendPushToUser } = await import("@/lib/push");
      await sendPushToUser(waiter.user_id, {
        title: "Match იპოვა! 🎮",
        body: `${gameSlug}-ში პარტნიორი გელოდება`,
        url: `/messages/${convId}`,
        tag: `lfg-match-${convId}`,
      });
    } catch {}

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

  if (error) {
    // Conflict — already searching for this game
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_searching" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    .update({ status: "cancelled" })
    .eq("user_id", user.id)
    .eq("status", "searching");
  if (queueId) {
    await q.eq("id", queueId);
  } else {
    await q;
  }

  return NextResponse.json({ ok: true });
}
