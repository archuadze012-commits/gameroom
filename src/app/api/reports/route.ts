import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { readJsonObject } from "@/lib/api/json";

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await readJsonObject(request, 4 * 1024);
  if (!body.ok) return body.response;

  const targetType = typeof body.data.targetType === "string" ? body.data.targetType : null;
  const targetId = typeof body.data.targetId === "string" ? body.data.targetId : null;
  const reason = typeof body.data.reason === "string" ? body.data.reason.slice(0, 500) : "";

  if (!targetType || !targetId || !reason.trim()) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!["message", "post", "profile"].includes(targetType)) {
    return NextResponse.json({ error: "invalid_target_type" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason: reason.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
