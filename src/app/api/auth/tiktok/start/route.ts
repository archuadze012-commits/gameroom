import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const clientKey = getServerEnv("TIKTOK_CLIENT_KEY");
  if (!clientKey) {
    return NextResponse.json({ error: "TikTok client key not configured" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/tiktok/callback`;
  
  // CSRF protection state (SECURITY: using cryptographically secure randomUUID instead of predictable Math.random)
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("tiktok_oauth_state", state, {
    maxAge: 300, // 5 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: "user.info.basic,video.list",
    response_type: "code",
    redirect_uri: redirectUri,
    state: state,
  });

  return NextResponse.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`);
}
