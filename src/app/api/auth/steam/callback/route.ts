import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

// Verifies the OpenID response by relaying it back to Steam with check_authentication mode.
async function verifySteamResponse(params: URLSearchParams): Promise<boolean> {
  const verifyParams = new URLSearchParams(params);
  verifyParams.set("openid.mode", "check_authentication");
  const res = await fetch("https://steamcommunity.com/openid/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });
  const text = await res.text();
  return text.includes("is_valid:true");
}

function extractSteamId(claimedId: string): string | null {
  const m = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
  return m ? m[1] : null;
}

export async function GET(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url));

  const params = request.nextUrl.searchParams;
  const valid = await verifySteamResponse(params);
  if (!valid) {
    return NextResponse.redirect(new URL("/settings?steam=invalid", request.url));
  }

  const claimedId = params.get("openid.claimed_id") ?? "";
  const steamId = extractSteamId(claimedId);
  if (!steamId) {
    return NextResponse.redirect(new URL("/settings?steam=invalid", request.url));
  }

  // Fetch player summary + owned games via Steam Web API
  const apiKey = process.env.STEAM_API_KEY;
  let profile: Record<string, unknown> = { steamId };
  if (apiKey) {
    try {
      const summaryRes = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`
      );
      const summary = await summaryRes.json();
      const player = summary?.response?.players?.[0];
      if (player) {
        profile = {
          steamId,
          personaName: player.personaname,
          profileUrl: player.profileurl,
          avatarUrl: player.avatarfull,
        };
      }

      const gamesRes = await fetch(
        `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`
      );
      const games = await gamesRes.json();
      const ownedGames = (games?.response?.games ?? []) as Array<{
        appid: number;
        name: string;
        playtime_forever: number;
        img_icon_url?: string;
      }>;
      const topGames = ownedGames
        .sort((a, b) => b.playtime_forever - a.playtime_forever)
        .slice(0, 20)
        .map((g) => ({
          appid: g.appid,
          name: g.name,
          minutes: g.playtime_forever,
        }));
      profile.gameCount = ownedGames.length;
      profile.topGames = topGames;
    } catch (e) {
      console.error("[steam callback fetch]", e);
    }
  }

  // Save to DB
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("linked_accounts")
    .upsert(
      {
        user_id: user.id,
        provider: "steam",
        external_id: steamId,
        data: profile,
        verified: true,
        refreshed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

  return NextResponse.redirect(new URL("/settings?steam=ok", request.url));
}
