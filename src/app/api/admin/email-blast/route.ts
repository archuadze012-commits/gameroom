import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Sends an email blast via Resend. Requires RESEND_API_KEY env var.
// Falls back to a "stub" mode (logs & saves to audit) if no API key set.
export async function POST(request: NextRequest) {
  const auth = await requirePermission("broadcast_email");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const parsed = await readJsonObject(request, 80 * 1024);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : "";
  const html = typeof body.html === "string" ? body.html.trim().slice(0, 50000) : "";
  const segment = typeof body.segment === "string" ? body.segment : "all";

  if (!subject || !html) {
    return NextResponse.json({ error: "subject and html required" }, { status: 400 });
  }

  // Build recipient list
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("profiles").select("email").not("email", "is", null).eq("banned", false);
  if (segment === "verified") query = query.eq("is_verified", true);
  if (segment === "active") {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("last_seen_at", cutoff);
  }
  const { data: profiles } = await query;
  const emails = (profiles ?? []).map((p) => p.email).filter((e): e is string => !!e);

  const apiKey = process.env.RESEND_API_KEY;
  let sent = 0;
  let stubbed = false;

  if (!apiKey) {
    stubbed = true;
  } else {
    // Send via Resend in batches
    const fromAddress = process.env.RESEND_FROM ?? "Gameroom <noreply@gameroom.com.ge>";
    for (let i = 0; i < emails.length; i += 50) {
      const batch = emails.slice(i, i + 50);
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress,
            to: fromAddress,
            bcc: batch,
            subject,
            html,
          }),
        });
        sent += batch.length;
      } catch (e) {
        console.error("[email-blast batch]", e);
      }
    }
  }

  await logAdminAction({
    actorId: auth.userId,
    action: "email_blast",
    metadata: { subject, segment, recipients: emails.length, sent, stubbed },
  });

  return NextResponse.json({ ok: true, recipients: emails.length, sent, stubbed });
}
