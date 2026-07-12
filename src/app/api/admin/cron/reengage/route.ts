import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { sendPushToUser } from "@/lib/push";
import { onlineCutoffIso } from "@/lib/presence";
import { getSiteOrigin } from "@/lib/url";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:cron-reengage");

// How many inactive users to nudge per run (bounds runtime).
const BATCH = 200;

function digestEmail(opts: {
  name: string;
  origin: string;
  unread: number;
  newFollowers: number;
  onlineNow: number;
}): string {
  const { name, origin, unread, newFollowers, onlineNow } = opts;
  const rows: string[] = [];
  if (newFollowers > 0) rows.push(`👥 <b>${newFollowers}</b> ახალი გამომწერი`);
  if (unread > 0) rows.push(`🔔 <b>${unread}</b> წაუკითხავი შეტყობინება`);
  if (onlineNow > 0) rows.push(`🟢 <b>${onlineNow}</b> მოთამაშე ონლაინ ახლა`);
  const list = rows.length > 0 ? rows.map((r) => `<li style="margin:6px 0">${r}</li>`).join("") : "<li>ბევრი რამ შეიცვალა 👀</li>";

  return `
  <div style="background:#0a0714;color:#fff;font-family:Arial,sans-serif;padding:32px;border-radius:16px;max-width:520px;margin:0 auto">
    <h1 style="font-size:22px;margin:0 0 8px">გამოგენატრე, ${name}! 🎮</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 20px">შენი დაბრუნებისას ეს გელოდება PlayGame-ზე:</p>
    <ul style="list-style:none;padding:0;margin:0 0 24px;font-size:15px;color:#e9d5ff">${list}</ul>
    <a href="${origin}/" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;text-decoration:none;font-weight:800;padding:12px 28px;border-radius:9999px;text-transform:uppercase;letter-spacing:1px;font-size:13px">დაბრუნება →</a>
    <p style="color:rgba(255,255,255,0.35);font-size:11px;margin:24px 0 0">
      შეტყობინებების მართვა: <a href="${origin}/settings" style="color:rgba(255,255,255,0.5)">პარამეტრები</a>
    </p>
  </div>`;
}

async function reengage(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const now = Date.now();
  // Users whose last activity was 7–8 days ago → nudge them once, ~a week out.
  const lo = new Date(now - 8 * 86400_000).toISOString();
  const hi = new Date(now - 7 * 86400_000).toISOString();

  const { data: targets } = await supabase
    .from("profiles")
    .select("id, username, display_name, email, last_seen_at")
    .eq("banned", false)
    .not("email", "is", null)
    .gte("last_seen_at", lo)
    .lt("last_seen_at", hi)
    .limit(BATCH);

  const users = targets ?? [];
  if (users.length === 0) return NextResponse.json({ ok: true, nudged: 0 });

  const { count: onlineNow } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("banned", false)
    .gt("last_seen_at", onlineCutoffIso(now));

  const origin = getSiteOrigin() ?? "https://playgame.ge";
  const apiKey = getServerEnv("RESEND_API_KEY");
  const fromAddress = getServerEnv("RESEND_FROM") ?? "PlayGame <noreply@gameroom.com.ge>";

  let emailed = 0;
  let pushed = 0;

  for (const u of users) {
    const name = u.display_name || u.username || "მოთამაშე";
    const [{ count: unread }, { count: newFollowers }] = await Promise.all([
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", u.id).is("read_at", null),
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", u.id)
        .gt("created_at", u.last_seen_at ?? lo),
    ]);

    // Push (best-effort, no-op if unsubscribed).
    try {
      await sendPushToUser(u.id, {
        title: "გამოგენატრე PlayGame-ზე 🎮",
        body: (newFollowers ?? 0) > 0 ? `${newFollowers} ახალი გამომწერი გელოდება` : "ნახე რა ახალია",
        url: "/",
        tag: "reengage",
      });
      pushed++;
    } catch (e) {
      logger.warn("reengage push failed", { userId: u.id, error: e });
    }

    // Email (only when Resend is configured).
    if (apiKey && u.email) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromAddress,
            to: u.email,
            subject: "გამოგენატრე PlayGame-ზე 🎮",
            html: digestEmail({ name, origin, unread: unread ?? 0, newFollowers: newFollowers ?? 0, onlineNow: onlineNow ?? 0 }),
          }),
          signal: AbortSignal.timeout(10000),
        });
        emailed++;
      } catch (e) {
        logger.warn("reengage email failed", { userId: u.id, error: e });
      }
    }
  }

  return NextResponse.json({ ok: true, nudged: users.length, emailed, pushed, emailConfigured: !!apiKey });
}

export const GET = reengage;
export const POST = reengage;
