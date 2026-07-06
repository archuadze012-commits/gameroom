import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { rateLimitShared } from "@/lib/rate-limit";

// Soft-linking: user provides their Riot ID (gameName#tagLine). We resolve
// the PUUID via Riot's account-v1 endpoint and optionally fetch Valorant rank.
// NOTE: "verified" stays false because we cannot prove ownership without RSO.
// To upgrade to true verification, integrate Riot Sign On (RSO) — gated approval.

const TIER_MAP: Record<string, string> = {
  Iron: "🪨",
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "🔷",
  Diamond: "💎",
  Ascendant: "🌟",
  Immortal: "⚡",
  Radiant: "👑",
};

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Each call fans out up to 3 requests against the shared RIOT_API_KEY, so a
  // scripted loop could exhaust the app-wide Riot quota — cap per user.
  if (!(await rateLimitShared(`riot-link:${user.id}`, 5, 60_000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const raw = typeof body.riotId === "string" ? body.riotId.trim() : "";
  if (!raw.includes("#")) {
    return NextResponse.json({ error: "format: gameName#tagLine" }, { status: 400 });
  }

  const [gameName, tagLine] = raw.split("#");
  if (!gameName || !tagLine) {
    return NextResponse.json({ error: "format: gameName#tagLine" }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RIOT_API_KEY not configured" }, { status: 503 });
  }

  // Step 1: get PUUID via account-v1 (uses the regional Americas/Europe/Asia routing)
  const accountRes = await fetch(
    `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`,
    { headers: { "X-Riot-Token": apiKey } }
  );

  if (!accountRes.ok) {
    if (accountRes.status === 404) {
      return NextResponse.json({ error: "Riot ID not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "riot_api_error", status: accountRes.status }, { status: 502 });
  }

  const account = await accountRes.json();
  const puuid: string = account.puuid;

  // Step 2: try to fetch active shard for Valorant
  let valShard: string | null = null;
  try {
    const shardRes = await fetch(
      `https://europe.api.riotgames.com/riot/account/v1/active-shards/by-game/val/by-puuid/${puuid}`,
      { headers: { "X-Riot-Token": apiKey } }
    );
    if (shardRes.ok) {
      const shard = await shardRes.json();
      valShard = shard.activeShard ?? null;
    }
  } catch {}

  const profile: Record<string, unknown> = {
    riotId: raw,
    gameName,
    tagLine,
    puuid,
    valShard,
  };

  // Step 3: try to fetch Valorant rank if shard is known
  if (valShard) {
    try {
      const rankRes = await fetch(
        `https://${valShard}.api.riotgames.com/val/ranked/v1/by-puuid/${puuid}`,
        { headers: { "X-Riot-Token": apiKey } }
      );
      if (rankRes.ok) {
        const rank = await rankRes.json();
        profile.valRank = rank;
        const tier = rank?.currentTier ?? null;
        if (tier !== null) {
          // Riot's tier numbers map approximately to: 0=Unrated, 3-5=Iron, 6-8=Bronze, ...
          const tierName =
            tier < 3 ? "Unrated" :
            tier < 6 ? "Iron" :
            tier < 9 ? "Bronze" :
            tier < 12 ? "Silver" :
            tier < 15 ? "Gold" :
            tier < 18 ? "Platinum" :
            tier < 21 ? "Diamond" :
            tier < 24 ? "Ascendant" :
            tier < 27 ? "Immortal" :
            "Radiant";
          profile.tierName = tierName;
          profile.tierEmoji = TIER_MAP[tierName] ?? "🎯";
        }
      }
    } catch {}
  }

  // onConflict (user_id,provider) only re-links your OWN riot account; if this
  // puuid is already linked to a different user the (provider,external_id) unique
  // index rejects (23505). Surface that instead of a false { ok: true }.
  const supabase = await createSupabaseServerClient();
  const { error: linkError } = await supabase
    .from("linked_accounts")
    .upsert(
      {
        user_id: user.id,
        provider: "riot",
        external_id: puuid,
        external_name:
          typeof (profile as { gameName?: unknown } | null)?.gameName === "string"
            ? (profile as { gameName: string }).gameName.slice(0, 256)
            : null,
        metadata: profile as never,
      },
      { onConflict: "user_id,provider" }
    );
  if (linkError) {
    const reason = linkError.code === "23505" ? "already_linked" : "save_failed";
    return NextResponse.json({ error: reason }, { status: 409 });
  }

  return NextResponse.json({ ok: true, profile });
}
