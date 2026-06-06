import { Client, GatewayIntentBits } from "discord.js";
import { getFirstServerEnv } from "@/lib/env";
import { createLogger } from "@/lib/logger";

let client: Client | null = null;
const logger = createLogger("discord");

export function getDiscordClient() {
  if (client) return client;

  const token = getFirstServerEnv(["DISCORD_BOT_TOKEN", "DISCORD__BOT_TOKEN"]);

  if (!token) {
    logger.error("missing Discord bot token");
    return null;
  }

  logger.info("initializing Discord client");
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  client.login(token.value)
    .then(() => logger.info("Discord login successful"))
    .catch((err) => {
      logger.error("Discord login failed", { error: err });
      client = null;
    });

  return client;
}
