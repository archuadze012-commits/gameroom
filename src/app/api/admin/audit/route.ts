import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const auth = await requirePermission("view_audit");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "100"), 500);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_actions")
    .select("id, action, target_type, target_id, metadata, created_at, profiles!admin_actions_actor_id_fkey(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
