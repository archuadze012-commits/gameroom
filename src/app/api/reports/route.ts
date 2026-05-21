import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const targetType = typeof body.targetType === "string" ? body.targetType : null;
  const targetId = typeof body.targetId === "string" ? body.targetId : null;
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : "";

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
