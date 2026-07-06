import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Liveness + readiness probe for uptime monitoring (e.g. UptimeRobot hitting
// this every 5 min). Unauthenticated and cheap: one head-count on a tiny stable
// table with a short timeout. Returns 200 {ok:true} when the app AND its DB
// respond, 503 when the DB is unreachable — so a monitor watching HTTP status
// catches "app up but Supabase down", not just a blank homepage. Never cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DB_TIMEOUT_MS = 3000;

export async function GET() {
  const ts = new Date().toISOString();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json({ ok: false, ts, db: "unconfigured" }, { status: 503 });
  }

  const supabase = createClient(url, anon, { auth: { persistSession: false } });

  // Trivial reachability check — count only, no rows, bounded by a timeout so a
  // hung DB doesn't hang the probe.
  const probe = supabase.from("games").select("id", { count: "exact", head: true }).limit(1);
  const timeout = new Promise<{ error: { message: string } }>((resolve) =>
    setTimeout(() => resolve({ error: { message: "db_timeout" } }), DB_TIMEOUT_MS),
  );

  try {
    const result = await Promise.race([probe, timeout]);
    if ("error" in result && result.error) {
      return NextResponse.json({ ok: false, ts, db: "down" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ts, db: "ok" });
  } catch {
    return NextResponse.json({ ok: false, ts, db: "down" }, { status: 503 });
  }
}
