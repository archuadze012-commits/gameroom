import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  // soft-delete + RLS ensures only author can update their own row
  const { error } = await supabase
    .from("lfg_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) {
    console.error("[/api/lfg DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
