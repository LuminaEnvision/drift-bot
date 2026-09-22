import { Bot } from "grammy";
import { registerAudits } from "./commands/audit.js";
import { registerPastedRepo, registerRepos } from "./commands/repos.js";
import { registerSettings } from "./commands/settings.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

const bot = new Bot(token);

registerSettings(bot);
registerRepos(bot);
registerAudits(bot);
registerPastedRepo(bot);

bot.catch((err) => {
  console.error("Bot error", err);
});

await bot.api.setMyCommands([
  { command: "start", description: "Say hi and start a 30-day trial" },
  { command: "help", description: "What I can do" },
  { command: "connect", description: "Watch a public GitHub repo" },
  { command: "repos", description: "Repos I'm watching" },
  { command: "disconnect", description: "Stop watching a repo" },
  { command: "audit_secrets", description: "Look for leaked keys" },
  { command: "audit_deps", description: "Known CVEs" },
  { command: "audit_code", description: "Risky code patterns" },
  { command: "audit_contracts", description: "Solidity footguns" },
  { command: "audit", description: "Break before launch" },
  { command: "tier", description: "Your plan" },
  { command: "upgrade", description: "Subscribe with Stars" },
]);

await bot.start({
  onStart: (info) => {
    console.log(`Drift Bot @${info.username} is running`);
  },
});
