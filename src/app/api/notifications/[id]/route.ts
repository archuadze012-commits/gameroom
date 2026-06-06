import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:notification");

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("failed to mark notification as read", { userId: user.id, notificationId: id, error });
    return NextResponse.json({ error: "notification_update_failed" }, { status: 500 });
  }
  if (count === 0) {
    return NextResponse.json({ error: "notification_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
