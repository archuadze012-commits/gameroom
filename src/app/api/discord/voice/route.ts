import { NextRequest, NextResponse } from "next/server";
import { getDiscordClient } from "@/lib/discord";
import { ChannelType, type VoiceChannel, type GuildMember } from "discord.js";
import { getSession } from "@/lib/auth";
import { requireAnyServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:discord-voice");

function matchesGame(channelName: string, categoryName: string | null, gameSlug: string): boolean {
  const name = channelName.toLowerCase();
  const cat = categoryName ? categoryName.toLowerCase() : "";
  const slug = gameSlug.toLowerCase();

  // Define keywords for games (avoid single letters to prevent false matches)
  const gameKeywords: Record<string, string[]> = {
    "pubg-mobile": ["pubg", "პაბჯი", "მობაილ"],
    "counter-strike-2": ["cs2", "counter", "strike", "კაეს"],
    "cs2": ["cs2", "counter", "strike", "კაეს"],
    "valorant": ["val", "valorant", "ვალო"],
    "dota-2": ["dota", "დოტა"],
    "brawl-stars": ["brawl", "stars", "ბრავლი"],
    "league-of-legends": ["lol", "league", "legends", "ლოლი"],
    "minecraft": ["mine", "craft", "minecraft", "მაინკრაფტი"],
    "gta-v": ["gta", "fivem", "ჯეტეა"],
    "apex-legends": ["apex", "აპექსი"],
    "fortnite": ["fort", "fortnite", "ფორტნაიტი"],
  };

  const thisGameKeywords = gameKeywords[slug] || [slug.replace("-", " ")];

  // 1. If it contains this game's keywords, it matches!
  const matchesThisGame = thisGameKeywords.some(keyword => name.includes(keyword) || cat.includes(keyword));
  if (matchesThisGame) return true;

  // 2. Check if it matches ANY OTHER game's keywords
  let matchesOtherGame = false;
  for (const [otherSlug, otherKeywords] of Object.entries(gameKeywords)) {
    // Skip checking current game (or its alias)
    if (
      otherSlug === slug || 
      (slug === "cs2" && otherSlug === "counter-strike-2") || 
      (slug === "counter-strike-2" && otherSlug === "cs2")
    ) {
      continue;
    }
    const matchesOther = otherKeywords.some(keyword => name.includes(keyword) || cat.includes(keyword));
    if (matchesOther) {
      matchesOtherGame = true;
      break;
    }
  }

  // 3. If it doesn't match any other game's keywords, we treat it as a general lobby channel and show it
  return !matchesOtherGame;
}

// ── Shared guild snapshot cache ─────────────────────────────────
// This route is polled every 10s PER viewer, and each request used to hit
// Discord's REST API (guild.fetch + channels.fetch). 20 viewers = 120 Discord
// calls/min → rate-limit risk + wasted CPU. Cache the full (unfiltered) snapshot
// module-side for ~10s and dedupe concurrent refreshes, so ONE Discord fetch
// serves every viewer; the per-request game filter runs against the cached copy.
const GUILD_CACHE_TTL_MS = 10_000;

type VoiceMember = {
  id: string; username: string; displayName: string; avatar: string;
  isMuted: boolean; isDeaf: boolean; isStreaming: boolean;
};
type VoiceChannelData = {
  id: string; name: string; categoryName: string | null;
  members: VoiceMember[]; userCount: number; userLimit: number; position: number;
};
type GuildVoiceSnapshot = {
  guildId: string; serverName: string; serverIcon: string | null;
  channels: VoiceChannelData[];
};

type DiscordClient = NonNullable<ReturnType<typeof getDiscordClient>>;

let guildSnapshotCache: { data: GuildVoiceSnapshot; expires: number } | null = null;
let guildSnapshotInFlight: Promise<GuildVoiceSnapshot> | null = null;

async function loadGuildSnapshot(client: DiscordClient, guildId: string): Promise<GuildVoiceSnapshot> {
  if (!client.isReady()) {
    await Promise.race([
      new Promise((resolve) => client.once("ready", () => resolve(true))),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Discord client timeout")), 8000)),
    ]);
  }

  const guild = await client.guilds.fetch(guildId);
  if (!guild) throw new Error("Guild not found");

  const channels = await guild.channels.fetch();
  const voiceChannels: VoiceChannelData[] = Array.from(channels.values())
    .filter((c): c is VoiceChannel => c?.type === ChannelType.GuildVoice)
    .map((c) => {
      const parentCategory = c.parentId ? channels.get(c.parentId) : null;
      return {
        id: c.id,
        name: c.name,
        categoryName: parentCategory ? parentCategory.name : null,
        members: c.members.map((m: GuildMember) => ({
          id: m.id,
          username: m.user.username,
          displayName: m.displayName,
          avatar: m.user.displayAvatarURL(),
          isMuted: !!(m.voice.selfMute || m.voice.serverMute),
          isDeaf: !!(m.voice.selfDeaf || m.voice.serverDeaf),
          isStreaming: !!(m.voice.selfVideo || m.voice.streaming),
        })),
        userCount: c.members.size,
        userLimit: c.userLimit,
        position: c.position,
      };
    })
    .sort((a, b) => a.position - b.position);

  return {
    guildId: guild.id,
    serverName: guild.name,
    serverIcon: guild.iconURL(),
    channels: voiceChannels,
  };
}

async function getGuildSnapshot(client: DiscordClient, guildId: string): Promise<GuildVoiceSnapshot> {
  const now = Date.now();
  if (guildSnapshotCache && guildSnapshotCache.expires > now) return guildSnapshotCache.data;
  if (guildSnapshotInFlight) return guildSnapshotInFlight;

  guildSnapshotInFlight = (async () => {
    try {
      const data = await loadGuildSnapshot(client, guildId);
      guildSnapshotCache = { data, expires: Date.now() + GUILD_CACHE_TTL_MS };
      return data;
    } finally {
      guildSnapshotInFlight = null;
    }
  })();
  return guildSnapshotInFlight;
}

export async function GET(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const client = getDiscordClient();
  if (!client) return NextResponse.json({ error: "Discord not configured" }, { status: 500 });

  const game = request.nextUrl.searchParams.get("game");
  const guildEnv = requireAnyServerEnv(["DISCORD_GUILD_ID", "DISCORD__GUILD_ID"], "api:discord-voice");
  if (!guildEnv.ok) return NextResponse.json({ error: "Missing GUILD_ID" }, { status: 500 });

  try {
    const snapshot = await getGuildSnapshot(client, guildEnv.value);
    const channels = game
      ? snapshot.channels.filter((c) => matchesGame(c.name, c.categoryName, game))
      : snapshot.channels;

    return NextResponse.json({
      guildId: snapshot.guildId,
      serverName: snapshot.serverName,
      serverIcon: snapshot.serverIcon,
      channels,
    });
  } catch (err) {
    logger.error("Discord voice route failed", { error: err });
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
