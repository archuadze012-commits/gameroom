import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function sweepExpiredHighlights(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  let authorized = false;
  if (secret && authHeader) {
    const expected = Buffer.from(`Bearer ${secret}`);
    const actual = Buffer.from(authHeader);
    if (expected.byteLength === actual.byteLength && crypto.timingSafeEqual(expected, actual)) {
      authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await supabase
    .from("clan_highlights")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  return NextResponse.json({ ok: !error, deleted: count ?? 0 });
}

// Vercel Cron invokes configured paths with GET. POST remains for explicit
// authenticated maintenance calls.
export const GET = sweepExpiredHighlights;
export const POST = sweepExpiredHighlights;
