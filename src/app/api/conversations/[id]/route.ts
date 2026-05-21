import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

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
