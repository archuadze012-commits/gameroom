import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

console.log("Token length:", token?.length);
console.log("Guild ID:", guildId);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once("ready", async () => {
  console.log(`✅ Bot logged in as: ${client.user.tag}`);
  console.log(`Bot is in ${client.guilds.cache.size} server(s):`);
  
  client.guilds.cache.forEach((guild) => {
    console.log(`  - ${guild.name} (ID: ${guild.id})`);
  });

  try {
    const guild = await client.guilds.fetch(guildId);
    console.log(`\n✅ Found target guild: ${guild.name}`);
    
    const channels = await guild.channels.fetch();
    const voiceChannels = channels.filter((c) => c?.type === 2);
    console.log(`Voice channels (${voiceChannels.size}):`);
    voiceChannels.forEach((c) => {
      console.log(`  🔊 ${c.name} (${c.members.size} members)`);
    });
  } catch (err) {
    console.error(`\n❌ Cannot access guild ${guildId}: ${err.message}`);
    console.log("\n👉 Bot needs to be INVITED to your server!");
    console.log("Use this URL to invite:");
    console.log(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=1049600&scope=bot`);
  }

  client.destroy();
  process.exit(0);
});

client.login(token).catch((err) => {
  console.error("❌ Login failed:", err.message);
  process.exit(1);
});
