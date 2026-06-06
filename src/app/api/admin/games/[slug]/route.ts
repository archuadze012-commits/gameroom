import { NextRequest, NextResponse } from "next/server";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const { slug } = await params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("games").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction({ actorId: auth.userId, action: "content.game.delete", targetType: "game", targetId: slug });
  return NextResponse.json({ ok: true });
}
