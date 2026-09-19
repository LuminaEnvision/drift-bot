import { Bot } from "grammy";
import { registerSettings } from "./commands/settings.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const bot = new Bot(token);

registerSettings(bot);

bot.catch((err) => {
  console.error("Bot error", err);
});

await bot.start({
  onStart: (info) => {
    console.log(`Drift Bot @${info.username} is running`);
  },
});
