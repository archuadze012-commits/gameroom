import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

type GuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireRateLimitedUser(
  _request: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<GuardResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const key = `${scope}:${user.id}`;
  if (!rateLimit(key, limit, windowMs)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "rate_limited" }, { status: 429 }),
    };
  }

  return { ok: true, userId: user.id };
}
