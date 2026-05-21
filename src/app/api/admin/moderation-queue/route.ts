import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission, logAdminAction } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const auth = await requirePermission("moderate_queue");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const status = request.nextUrl.searchParams.get("status") ?? "pending";

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("moderation_queue")
    .select("id, content_type, content_id, content_snapshot, ai_score, ai_reason, status, created_at, profiles!moderation_queue_author_id_fkey(username, display_name)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission("moderate_queue");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const itemId = typeof body.id === "string" ? body.id : null;
  const action = typeof body.action === "string" ? body.action : null;

  if (!itemId || !["approve", "reject"].includes(action ?? "")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const newStatus = action === "approve" ? "approved" : "rejected";

  const { data: item } = await supabase
    .from("moderation_queue")
    .select("content_type, content_id")
    .eq("id", itemId)
    .maybeSingle();

  const { error } = await supabase
    .from("moderation_queue")
    .update({ status: newStatus, resolved_by: auth.userId, resolved_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If rejected, also soft-delete the underlying content
  if (action === "reject" && item) {
    const now = new Date().toISOString();
    if (item.content_type === "post") {
      await supabase.from("posts").update({ deleted_at: now, deleted_by: auth.userId }).eq("id", item.content_id);
    } else if (item.content_type === "message") {
      await supabase.from("chat_messages").update({ deleted_at: now, deleted_by: auth.userId }).eq("id", item.content_id);
    }
  }

  await logAdminAction({
    actorId: auth.userId,
    action: `queue_${action}`,
    targetType: "moderation_queue",
    targetId: itemId,
  });
  return NextResponse.json({ ok: true });
}
