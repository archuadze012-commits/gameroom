import { NextRequest, NextResponse } from "next/server";
import { moderateText } from "@/lib/moderate";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { readJsonObject } from "@/lib/api/json";

export async function POST(request: NextRequest) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`moderate:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await readJsonObject<{ message?: string; text?: string }>(request, 4 * 1024);
  if (!body.ok) return NextResponse.json({ toxic: false, ok: true });

  const content = ((body.data.message ?? body.data.text ?? "")).trim().slice(0, 1000);
  if (!content) return NextResponse.json({ toxic: false, ok: true });

  const result = await moderateText(content);
  return NextResponse.json({ toxic: !result.ok, ok: result.ok, reason: result.reason });
}
