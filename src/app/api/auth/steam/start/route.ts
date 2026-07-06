import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

export async function GET(request: Request) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const origin = new URL(request.url).origin;

  // CSRF binding: without a state that ties the callback to the session that
  // started it, an attacker could complete a Steam login for their OWN steamid,
  // capture the valid callback URL, and lure a logged-in victim to open it —
  // forcing the attacker's Steam identity to be linked onto the victim's account.
  // Steam echoes openid.return_to back verbatim, so we round-trip the state there
  // and also stash it in an httpOnly cookie to compare on return (same as TikTok).
  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("steam_oauth_state", state, {
    maxAge: 300, // 5 minutes
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  const returnTo = `${origin}/api/auth/steam/callback?state=${state}`;
  const realm = origin;

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return NextResponse.redirect(`https://steamcommunity.com/openid/login?${params.toString()}`);
}
