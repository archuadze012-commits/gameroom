import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireServerEnv } from "@/lib/env";

export async function GET(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const room = request.nextUrl.searchParams.get("room");
  const username = user.user_metadata?.display_name || user.email?.split("@")[0] || "Guest";

  if (!room) {
    return NextResponse.json({ error: "Missing room name" }, { status: 400 });
  }

  const apiKey = requireServerEnv("LIVEKIT_API_KEY", "api:voice-token");
  const apiSecret = requireServerEnv("LIVEKIT_API_SECRET", "api:voice-token");
  const wsUrl = requireServerEnv("NEXT_PUBLIC_LIVEKIT_URL", "api:voice-token");

  if (!apiKey.ok || !apiSecret.ok || !wsUrl.ok) {
    return NextResponse.json(
      { error: "Server misconfigured: LiveKit keys missing" },
      { status: 500 }
    );
  }

  const at = new AccessToken(apiKey.value, apiSecret.value, {
    identity: user.id,
    name: username,
  });

  at.addGrant({
    roomJoin: true,
    room: room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return NextResponse.json({ token: await at.toJwt() });
}
