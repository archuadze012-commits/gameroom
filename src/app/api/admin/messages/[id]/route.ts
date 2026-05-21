import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission, logAdminAction } from "@/lib/admin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("manage_chat");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("chat_messages")
    .update({ deleted_at: new Date().toISOString(), deleted_by: auth.userId })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "delete_message",
    targetType: "message",
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
