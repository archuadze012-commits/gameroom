import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { rateLimitShared } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:referral:redeem");

// Manual referral attribution: a user types the code of whoever invited them,
// as a fallback for when the cookie-based auto-attribution (app/i/[code] +
// auth/callback) never landed — different device, cleared cookies, or a code
// heard by word of mouth.
//
// Bounded to accounts younger than this window: qualification (the reward gate
// in process_referral_qualification) is otherwise trivial for an already-active
// account, so without an age cap an established user could retroactively enter
// a friend's code and instantly farm the 1000 NC referrer reward. All writes go
// through the service-role client — `referrals` has no authenticated INSERT
// grant, so there is no client-side write path.
const REDEEM_WINDOW_DAYS = 14;
const CODE_RE = /^[A-Z0-9]{4,12}$/;

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimitShared(`referral-redeem:${user.id}`, 8, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const code =
    typeof body.code === "string" ? body.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  if (!CODE_RE.test(code)) return NextResponse.json({ error: "invalid_code" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: me } = await admin
    .from("profiles")
    .select("created_at, referral_code")
    .eq("id", user.id)
    .maybeSingle();
  if (!me) return NextResponse.json({ error: "unknown" }, { status: 500 });

  // New-account window (see note above).
  if (Date.now() - new Date(me.created_at).getTime() > REDEEM_WINDOW_DAYS * 86_400_000) {
    return NextResponse.json({ error: "window_closed" }, { status: 403 });
  }

  // Can't enter your own code.
  if (me.referral_code && me.referral_code.toUpperCase() === code) {
    return NextResponse.json({ error: "self_referral" }, { status: 400 });
  }

  // One referrer per referred user — don't overwrite an existing (e.g.
  // cookie-attributed) referral.
  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "already_referred" }, { status: 409 });

  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();
  if (!referrer) return NextResponse.json({ error: "code_not_found" }, { status: 404 });
  if (referrer.id === user.id) return NextResponse.json({ error: "self_referral" }, { status: 400 });

  const { error } = await admin.from("referrals").insert({
    referrer_id: referrer.id,
    referred_id: user.id,
    code_used: code,
    status: "pending",
  });
  if (error) {
    // Unique violation on referred_id = a concurrent insert already attributed us.
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "already_referred" }, { status: 409 });
    }
    logger.error("referral redeem insert failed", { userId: user.id, error });
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  // Mutual auto-follow (mirrors the cookie-attribution path in auth/callback).
  await admin
    .from("follows")
    .upsert(
      [
        { follower_id: user.id, following_id: referrer.id },
        { follower_id: referrer.id, following_id: user.id },
      ],
      { onConflict: "follower_id,following_id", ignoreDuplicates: true },
    );

  return NextResponse.json({ ok: true });
}
