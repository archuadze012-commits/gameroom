import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "node:crypto";

async function sweepExpiredHighlights(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || !authHeader) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const expectedToken = `Bearer ${secret}`;
  const providedBuffer = Buffer.from(authHeader);
  const expectedBuffer = Buffer.from(expectedToken);

  if (
    providedBuffer.byteLength !== expectedBuffer.byteLength ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
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
