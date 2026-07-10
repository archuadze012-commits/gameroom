import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:notifications");

export async function GET(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ notifications: [] });

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id);
  if (request.nextUrl.searchParams.get("unread") === "1") {
    query = query.is("read_at", null);
  }
  const { data, error } = await query.order("created_at", { ascending: false }).limit(50);

  if (error) {
    logger.error("failed to fetch notifications", { userId: user.id, error });
    return NextResponse.json({ error: "notifications_fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH() {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    logger.error("failed to mark notifications as read", { userId: user.id, error });
    return NextResponse.json({ error: "notifications_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
