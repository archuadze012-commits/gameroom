import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:lfg");

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  // soft-delete + RLS ensures only author can update their own row
  const { error, count } = await supabase
    .from("lfg_posts")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) {
    logger.error("failed to delete LFG post", { postId: id, userId: user.id, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (count === 0) {
    logger.warn("LFG delete matched no rows", { postId: id, userId: user.id });
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
