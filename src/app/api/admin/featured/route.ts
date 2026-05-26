import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requirePermission("manage_pins");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("featured_content")
    .select("*")
    .eq("active", true)
    .order("position", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_pins");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const parsed = await readJsonObject(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const featureType = typeof body.featureType === "string" ? body.featureType : null;
  const targetId = typeof body.targetId === "string" ? body.targetId : null;
  const position = typeof body.position === "number" ? body.position : 0;

  if (!featureType || !targetId || !["tournament", "profile", "game"].includes(featureType)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("featured_content")
    .insert({ feature_type: featureType, target_id: targetId, position, created_by: auth.userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "feature_content",
    targetType: featureType,
    targetId,
  });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission("manage_pins");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("featured_content").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "unfeature_content",
    targetType: "featured",
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
