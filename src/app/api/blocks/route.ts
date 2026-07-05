import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { readJsonObject } from "@/lib/api/json";
import { rateLimit } from "@/lib/rate-limit";

// POST { userId } — block a user. RLS enforces blocker_id = caller.
export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!rateLimit(`block:${user.id}`, 20, 60_000))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await readJsonObject(request, 1024);
  if (!body.ok) return body.response;

  const targetId = typeof body.data.userId === "string" ? body.data.userId : null;
  if (!targetId || targetId === user.id) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  // Idempotent: re-blocking an already-blocked user is a no-op success.
  const { error } = await supabase
    .from("user_blocks")
    .upsert({ blocker_id: user.id, blocked_id: targetId }, { onConflict: "blocker_id,blocked_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocked: true });
}

// DELETE { userId } — unblock a user.
export async function DELETE(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!rateLimit(`block:${user.id}`, 20, 60_000))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await readJsonObject(request, 1024);
  if (!body.ok) return body.response;

  const targetId = typeof body.data.userId === "string" ? body.data.userId : null;
  if (!targetId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocked: false });
}
