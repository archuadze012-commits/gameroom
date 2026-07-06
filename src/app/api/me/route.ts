import { NextResponse } from "next/server";
import { after } from "next/server";
import { getSession } from "@/lib/auth";
import { updateLastSeen } from "@/lib/update-last-seen";

// Lightweight client-consumable auth snapshot. Exists so the ROOT LAYOUT no
// longer has to call getSession() (which reads cookies() and opted the entire
// app into dynamic rendering — every route was ƒ Dynamic). The client chrome
// fetches this once on mount instead. Also carries the per-visit updateLastSeen
// side effect (daily-login XP + last_seen) that used to live in the layout's
// after() — run here in after() so it never blocks the response.
export const dynamic = "force-dynamic";

const ROOT_ADMIN_EMAILS = [
  "archuadze012@gmail.com",
  ...(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean),
];

export async function GET() {
  const user = await getSession().catch(() => null);
  if (!user) {
    return NextResponse.json({ authenticated: false, canEdit: false });
  }
  after(() => updateLastSeen(user.id));
  const canEdit = !!user.email && ROOT_ADMIN_EMAILS.includes(user.email);
  return NextResponse.json({ authenticated: true, canEdit });
}
