import { Client, GatewayIntentBits } from "discord.js";

let client: Client | null = null;

export function getDiscordClient() {
  if (client) return client;

  const token = (process.env.DISCORD_BOT_TOKEN || process.env.DISCORD__BOT_TOKEN || "").replace(/^﻿/, "").trim();
  console.log("[Discord] Token present:", !!token, "Length:", token.length);

  if (!token) {
    console.error("[Discord] Missing BOT_TOKEN");
    return null;
  }

  console.log("[Discord] Initializing client...");
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  console.log("[Discord] Logging in...");
  client.login(token)
    .then(() => console.log("[Discord] Login successful"))
    .catch((err) => {
      console.error("[Discord] Login failed:", err);
      client = null;
    });

  return client;
}
