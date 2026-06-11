import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

async function sweepExpiredBansAndMutes(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || !authHeader) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Prevent timing attacks by using a constant-time string comparison
  const expectedAuth = `Bearer ${secret}`;
  const authHeaderBuffer = Buffer.from(authHeader);
  const expectedAuthBuffer = Buffer.from(expectedAuth);

  if (
    authHeaderBuffer.byteLength !== expectedAuthBuffer.byteLength ||
    !crypto.timingSafeEqual(authHeaderBuffer, expectedAuthBuffer)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error: banErr, count: banCount } = await supabase
    .from("profiles")
    .update({ banned: false, ban_expires_at: null }, { count: "exact" })
    .eq("banned", true)
    .lt("ban_expires_at", now);

  const { error: muteErr, count: muteCount } = await supabase
    .from("user_mutes")
    .delete({ count: "exact" })
    .lt("expires_at", now)
    .not("expires_at", "is", null);

  return NextResponse.json({
    ok: !banErr && !muteErr,
    unbanned: banCount ?? 0,
    unmuted: muteCount ?? 0,
  });
}

// Vercel Cron invokes configured paths with GET. POST remains for explicit
// authenticated maintenance calls.
export const GET = sweepExpiredBansAndMutes;
export const POST = sweepExpiredBansAndMutes;
