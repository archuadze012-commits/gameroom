import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission, logAdminAction } from "@/lib/admin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Delete from DB (no-op if it's a mock-only game)
  await supabase.from("cracked_games").delete().eq("id", id);

  // Mark as hidden so mock games are also excluded
  const { error: hideError } = await supabase
    .from("hidden_cracked_games")
    .upsert({ id }, { onConflict: "id" });
  if (hideError) {
    console.error("[/api/admin/cracked-games DELETE]", hideError);
    return NextResponse.json({ error: hideError.message }, { status: 500 });
  }

  await logAdminAction({
    actorId: auth.userId,
    action: "cracked_games.delete",
    targetType: "cracked_game",
    targetId: id,
  });

  return NextResponse.json({ ok: true });
}
