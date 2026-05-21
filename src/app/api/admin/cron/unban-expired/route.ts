import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Called by Vercel cron. Sweeps expired bans and mutes.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = await createSupabaseServerClient();
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
