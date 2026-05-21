import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { requirePermission, logAdminAction } from "@/lib/admin";

export async function GET() {
  const user = await getSession().catch(() => null);
  const supabase = await createSupabaseServerClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, severity, created_at, expires_at")
    .or(`expires_at.gt.${new Date().toISOString()},expires_at.is.null`)
    .order("created_at", { ascending: false })
    .limit(20);

  let readIds: string[] = [];
  if (user) {
    const { data: reads } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", user.id);
    readIds = (reads ?? []).map((r) => r.announcement_id);
  }

  return NextResponse.json({
    announcements: announcements ?? [],
    readIds,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_announcements");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  const messageBody = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
  const severity = ["info", "warning", "critical"].includes(body.severity) ? body.severity : "info";
  const expiresAt = typeof body.expiresAt === "string" ? body.expiresAt : null;

  if (!title || !messageBody) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("announcements")
    .insert({ title, body: messageBody, severity, author_id: auth.userId, expires_at: expiresAt })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "create_announcement",
    targetType: "announcement",
    targetId: data.id,
    metadata: { title, severity },
  });

  // Push to all subscribers (best-effort)
  try {
    const { sendPushToUser } = await import("@/lib/push");
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .limit(10000);
    const uniqueUserIds = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
    await Promise.all(
      uniqueUserIds.map((uid) =>
        sendPushToUser(uid, {
          title,
          body: messageBody.slice(0, 100),
          url: "/",
          tag: `announcement-${data.id}`,
        })
      )
    );
  } catch {}

  return NextResponse.json(data);
}
