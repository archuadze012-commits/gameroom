import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requirePermission("manage_chat");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const status = request.nextUrl.searchParams.get("status") ?? "open";

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at, resolved_at, profiles!reports_reporter_id_fkey(username, display_name)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission("manage_chat");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const parsed = await readJsonObject(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const reportId = typeof body.reportId === "string" ? body.reportId : null;
  const action = typeof body.action === "string" ? body.action : null;

  if (!reportId || !["dismiss", "action"].includes(action ?? "")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const status = action === "dismiss" ? "dismissed" : "actioned";
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_by: auth.userId, resolved_at: new Date().toISOString() })
    .eq("id", reportId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: `report_${action}`,
    targetType: "report",
    targetId: reportId,
  });
  return NextResponse.json({ ok: true });
}
