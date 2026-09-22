import { Bot, type Context } from "grammy";
import {
  errorMessage,
  runRepoAudit,
  upsertUser,
  type AuditKind,
} from "../backend.js";
import { chunkTelegram, formatAuditReport } from "../formatters/audit.js";

function requireFrom(ctx: { from?: { id: number; username?: string } }) {
  if (!ctx.from) {
    throw new Error("Telegram user is missing");
  }
  return ctx.from;
}

async function runAndReply(ctx: Context, kind: AuditKind, repo?: string) {
  const from = requireFrom(ctx);
  await upsertUser(from.id, from.username);
  await ctx.reply("On it. Cloning and checking. This can take a minute.");
  const { report } = await runRepoAudit(from.id, kind, repo);
  for (const chunk of chunkTelegram(formatAuditReport(report))) {
    await ctx.reply(chunk);
  }
}

function commandRepo(ctx: Context): string | undefined {
  const value = typeof ctx.match === "string" ? ctx.match.trim() : "";
  return value.length > 0 ? value : undefined;
}

export function registerAudits(bot: Bot) {
  bot.command("audit_secrets", async (ctx) => {
    try {
      await runAndReply(ctx, "secrets", commandRepo(ctx));
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't run the secrets check. Try again."));
    }
  });

  bot.command("audit_deps", async (ctx) => {
    try {
      await runAndReply(ctx, "deps", commandRepo(ctx));
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't run the dependency check. Try again."));
    }
  });

  bot.command("audit_code", async (ctx) => {
    try {
      await runAndReply(ctx, "code", commandRepo(ctx));
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't run the code check. Try again."));
    }
  });

  bot.command("audit_contracts", async (ctx) => {
    try {
      await runAndReply(ctx, "contracts", commandRepo(ctx));
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't run the contract check. Try again."));
    }
  });

  bot.command("audit", async (ctx) => {
    try {
      await runAndReply(ctx, "full", commandRepo(ctx));
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't run the full audit. Try again."));
    }
  });

  bot.callbackQuery(/^audit:(secrets|deps|code|contracts|full):(.+)$/, async (ctx) => {
    const kind = ctx.match[1] as AuditKind;
    const repo = ctx.match[2];
    await ctx.answerCallbackQuery();
    try {
      await runAndReply(ctx, kind, repo);
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't run that audit. Try the slash command."));
    }
  });
}
