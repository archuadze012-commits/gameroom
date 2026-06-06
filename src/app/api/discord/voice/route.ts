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

export async function GET(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const client = getDiscordClient();
  if (!client) return NextResponse.json({ error: "Discord not configured" }, { status: 500 });

  const game = request.nextUrl.searchParams.get("game");
  const guildEnv = requireAnyServerEnv(["DISCORD_GUILD_ID", "DISCORD__GUILD_ID"], "api:discord-voice");
  if (!guildEnv.ok) return NextResponse.json({ error: "Missing GUILD_ID" }, { status: 500 });

  try {
    logger.debug("checking Discord client readiness");
    // Wait for client to be ready with a 5s timeout
    if (!client.isReady()) {
      logger.info("Discord client not ready, waiting");
      await Promise.race([
        new Promise((resolve) => client!.once("ready", () => {
          logger.info("Discord client became ready");
          resolve(true);
        })),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Discord client timeout")), 8000))
      ]);
    }

    logger.debug("fetching Discord guild", { guildEnv: guildEnv.name });
    const guild = await client.guilds.fetch(guildEnv.value);
    if (!guild) return NextResponse.json({ error: "Guild not found" }, { status: 404 });

    const channels = await guild.channels.fetch();
    const voiceChannels = Array.from(channels.values())
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
            isMuted: m.voice.selfMute || m.voice.serverMute,
            isDeaf: m.voice.selfDeaf || m.voice.serverDeaf,
            isStreaming: m.voice.selfVideo || m.voice.streaming,
          })),
          userCount: c.members.size,
          userLimit: c.userLimit,
          position: c.position,
        };
      })
      .sort((a, b) => a.position - b.position);

    let filteredChannels = voiceChannels;
    if (game) {
      filteredChannels = voiceChannels.filter((c) => 
        matchesGame(c.name, c.categoryName, game)
      );
    }

    return NextResponse.json({
      guildId: guild.id,
      serverName: guild.name,
      serverIcon: guild.iconURL(),
      channels: filteredChannels,
    });
  } catch (err) {
    logger.error("Discord voice route failed", { error: err });
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
