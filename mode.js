const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Partials,
} = require("discord.js");

const BOT_TOKEN = process.env.BOT_TOKEN;
const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID;
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID || "";
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;

if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN environment variable.");
  process.exit(1);
}

if (!ALLOWED_USER_ID) {
  console.error("Missing ALLOWED_USER_ID environment variable.");
  process.exit(1);
}

if (!TARGET_CHANNEL_ID) {
  console.error("Missing TARGET_CHANNEL_ID environment variable.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once("ready", () => {
  client.user.setPresence({
    status: "online",
  });

  console.log(`Relay bot online as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (message.author.id !== ALLOWED_USER_ID) return;

    if (SOURCE_CHANNEL_ID) {
      if (message.channel.id !== SOURCE_CHANNEL_ID) return;
    } else if (message.guild) {
      return;
    }

    const content = message.content?.trim() || "";

    if (!content && message.attachments.size === 0) return;

    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);

    if (!targetChannel || !targetChannel.isTextBased()) {
      console.error("Target channel was not found or is not a text channel.");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xffcc00)
      .setAuthor({
        name: `${message.author.username} said:`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setDescription(content || "*[attachment]*")
      .setTimestamp(message.createdAt);

    const files = [...message.attachments.values()].map((attachment) => ({
      attachment: attachment.url,
      name: attachment.name || undefined,
    }));

    await targetChannel.send({
      embeds: [embed],
      ...(files.length > 0 ? { files } : {}),
    });

    console.log(
      `Relayed message from ${message.author.username} to ${TARGET_CHANNEL_ID}`
    );
  } catch (error) {
    console.error("Relay error:", error);
  }
});

client.on("error", (error) => {
  console.error("Discord client error:", error);
});

function shutdown(signal) {
  console.log(`Received ${signal}; shutting down.`);
  client.destroy();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

client.login(BOT_TOKEN).catch((error) => {
  console.error("Discord login failed:", error);
  process.exit(1);
});
