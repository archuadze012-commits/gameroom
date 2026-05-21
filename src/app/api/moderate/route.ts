import { NextRequest, NextResponse } from "next/server";
import { moderateText } from "@/lib/moderate";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`moderate:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { message?: string; text?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ toxic: false, ok: true }); }

  const content = ((body.message ?? body.text ?? "")).trim();
  if (!content) return NextResponse.json({ toxic: false, ok: true });

  const result = await moderateText(content);
  return NextResponse.json({ toxic: !result.ok, ok: result.ok, reason: result.reason });
}
