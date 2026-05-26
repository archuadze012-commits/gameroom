import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requirePermission("manage_pins");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pinned_content")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_pins");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const parsed = await readJsonObject(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const contentType = typeof body.contentType === "string" ? body.contentType : null;
  const contentId = typeof body.contentId === "string" ? body.contentId : null;

  if (!contentType || !contentId || !["post", "news"].includes(contentType)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pinned_content")
    .insert({ content_type: contentType, content_id: contentId, pinned_by: auth.userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "pin_content",
    targetType: contentType,
    targetId: contentId,
  });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission("manage_pins");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const pinId = request.nextUrl.searchParams.get("id");
  if (!pinId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("pinned_content").delete().eq("id", pinId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "unpin_content",
    targetType: "pin",
    targetId: pinId,
  });
  return NextResponse.json({ ok: true });
}
