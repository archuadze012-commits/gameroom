import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:lfg-respond");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: postId } = await params;
  const body = await request.json().catch(() => ({}));
  const { responseId, action } = body;

  if (!responseId || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // 1. Verify post ownership and check slots
  const { data: post, error: postError } = await supabase
    .from("lfg_posts")
    .select("id, author_id, slots_total, slots_filled, title")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (postError || !post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }
  if (post.author_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 2. Fetch the response
  const { data: response, error: respError } = await supabase
    .from("lfg_responses")
    .select("id, user_id, status")
    .eq("id", responseId)
    .eq("post_id", postId)
    .maybeSingle();

  if (respError || !response) {
    return NextResponse.json({ error: "response not found" }, { status: 404 });
  }
  if (response.status !== "pending") {
    return NextResponse.json({ error: "already processed" }, { status: 400 });
  }

  // 3. Process acceptance
  if (action === "accept") {
    if (post.slots_filled >= post.slots_total) {
      return NextResponse.json({ error: "no slots available" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("lfg_responses")
      .update({ status: "accepted" })
      .eq("id", responseId);

    if (updateError) {
      logger.error("failed to accept LFG response", { postId, responseId, error: updateError });
      return NextResponse.json({ error: "database error" }, { status: 500 });
    }

    const newFilled = post.slots_filled + 1;
    const newStatus = newFilled >= post.slots_total ? "filled" : "open";
    
    const { error: postUpdateError } = await supabase
      .from("lfg_posts")
      .update({ slots_filled: newFilled, status: newStatus })
      .eq("id", postId);
    if (postUpdateError) {
      logger.error("failed to update LFG post slots after accepting response", {
        postId,
        responseId,
        error: postUpdateError,
      });
      return NextResponse.json({ error: "database error" }, { status: 500 });
    }

    // Send push notification to accepted user
    sendPushToUser(response.user_id, {
      title: "ლოკალში მიღებული ხარ! 🎉",
      body: `ავტორმა დაადასტურა შენი მოთხოვნა პოსტზე: ${post.title}`,
      url: `/lfg/${postId}`,
      tag: `lfg-accept-${postId}`,
    }).catch((error) => {
      logger.warn("failed to send LFG accept push", {
        postId,
        responseId,
        recipientId: response.user_id,
        error,
      });
    });

  } else {
    // Process rejection
    const { error: updateError } = await supabase
      .from("lfg_responses")
      .update({ status: "rejected" })
      .eq("id", responseId);

    if (updateError) {
      logger.error("failed to reject LFG response", { postId, responseId, error: updateError });
      return NextResponse.json({ error: "database error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
