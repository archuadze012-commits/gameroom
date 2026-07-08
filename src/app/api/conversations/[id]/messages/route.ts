import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Verify participant
  const { data: conv } = await supabase
    .from("conversations")
    .select("user_a, user_b")
    .eq("id", id)
    .maybeSingle();

  if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Fetch the NEWEST 200 (descending + limit), then reverse to ascending for
  // display. Ordering ascending before the limit would pin the response to the
  // OLDEST 200 messages forever — newer messages would never load on refresh.
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const messages = (data ?? []).slice().reverse();

  // Mark unread messages addressed to current user as read
  await supabase
    .from("conversation_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .neq("sender_id", user.id)
    .is("read_at", null);

  return NextResponse.json(messages);
}
