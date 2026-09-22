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

function commandRepo(ctx: Context): string {
  const text = ctx.message?.text ?? "";
  const stripped = text.replace(/^\/(?:digest_now|digest)(?:@\w+)?\s*/i, "").trim();
  if (stripped) {
    return stripped;
  }
  return typeof ctx.match === "string" ? ctx.match.trim() : "";
}

async function runAndReply(ctx: Context, repo?: string) {
  const from = requireFrom(ctx);
  await upsertUser(from.id, from.username);
  await ctx.reply("Running the cheap check now. CVE scan plus CI. This can take a minute.");
  const { reports } = await runRepoDigest(from.id, repo && repo.length > 0 ? repo : undefined);
  for (const report of reports) {
    for (const chunk of chunkTelegram(formatDigest(report))) {
      await ctx.reply(chunk);
    }
  }
}

export function registerDigest(bot: Bot) {
  const handle = async (ctx: Context) => {
    try {
      await runAndReply(ctx, commandRepo(ctx));
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't run the digest. Try again."));
    }
  };

  bot.command(["digest", "digest_now"], handle);

  bot.callbackQuery(/^digest:(.+)$/, async (ctx) => {
    const repo = ctx.match[1];
    await ctx.answerCallbackQuery();
    try {
      await runAndReply(ctx, repo);
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't run the digest. Try /digest."));
    }
  });
}
