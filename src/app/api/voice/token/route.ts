import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

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

  const apiKey = (process.env.LIVEKIT_API_KEY ?? "").replace(/^﻿/, "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET ?? "").replace(/^﻿/, "").trim();
  const wsUrl = (process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "").replace(/^﻿/, "").trim();

  console.log("[VoiceToken] API Key length:", apiKey.length);
  console.log("[VoiceToken] API Secret length:", apiSecret.length);
  console.log("[VoiceToken] WS URL:", wsUrl);

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      { error: "Server misconfigured: LiveKit keys missing" },
      { status: 500 }
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
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
