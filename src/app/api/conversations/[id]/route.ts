import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

// Lightweight "mark my unread messages in this conversation as read". The
// realtime message handler used to hit GET /messages just for this side effect,
// which shipped the entire (up-to-200) history back on every incoming message.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: conv } = await supabase
    .from("conversations")
    .select("user_a, user_b")
    .eq("id", id)
    .maybeSingle();
  if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await supabase
    .from("conversation_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .neq("sender_id", user.id)
    .is("read_at", null);

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: conv } = await supabase
    .from("conversations")
    .select("user_a, user_b")
    .eq("id", id)
    .maybeSingle();

  if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await supabase
    .from("conversation_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("conversation_id", id);

  await supabase.from("conversations").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
