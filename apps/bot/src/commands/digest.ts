import { Bot, type Context } from "grammy";
import { errorMessage, runRepoDigest, upsertUser } from "../backend.js";
import { chunkTelegram } from "../formatters/audit.js";
import { formatDigest } from "../formatters/digest.js";

function requireFrom(ctx: { from?: { id: number; username?: string } }) {
  if (!ctx.from) {
    throw new Error("Telegram user is missing");
  }
  return ctx.from;
}

export function registerDigest(bot: Bot) {
  bot.command("digest", async (ctx) => {
    const from = requireFrom(ctx);
    const repo = typeof ctx.match === "string" ? ctx.match.trim() : "";
    try {
      await upsertUser(from.id, from.username);
      await ctx.reply("Running the cheap check now. CVE scan plus CI. This can take a minute.");
      const { reports } = await runRepoDigest(from.id, repo.length > 0 ? repo : undefined);
      for (const report of reports) {
        for (const chunk of chunkTelegram(formatDigest(report))) {
          await ctx.reply(chunk);
        }
      }
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't run the digest. Try again."));
    }
  });

  bot.callbackQuery(/^digest:(.+)$/, async (ctx) => {
    const repo = ctx.match[1];
    await ctx.answerCallbackQuery();
    try {
      const from = requireFrom(ctx);
      await upsertUser(from.id, from.username);
      await ctx.reply("Running the cheap check now.");
      const { reports } = await runRepoDigest(from.id, repo);
      for (const report of reports) {
        for (const chunk of chunkTelegram(formatDigest(report))) {
          await ctx.reply(chunk);
        }
      }
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't run the digest. Try /digest."));
    }
  });
}
