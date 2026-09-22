import { Bot, InputFile, type Context } from "grammy";
import {
  errorMessage,
  runRepoAudit,
  upsertUser,
  type AuditKind,
} from "../backend.js";
import { chunkTelegram, formatAuditReport } from "../formatters/audit.js";
import { promptToPdf } from "../formatters/pdf.js";
import { formatAgentPrompt } from "../formatters/prompt.js";

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

  const prompt = formatAgentPrompt(report);
  const slug = report.repo.replaceAll("/", "-").replaceAll(/[^A-Za-z0-9._-]/g, "_");
  const base = `drift-${slug}-${report.kind}`;
  const pdf = await promptToPdf(prompt);

  try {
    await ctx.replyWithDocument(new InputFile(pdf, `${base}.pdf`), {
      caption: "Download the PDF. Every finding, file link, why it matters, and what to do. Copy-paste ready.",
    });
    await ctx.replyWithDocument(new InputFile(Buffer.from(prompt, "utf8"), `${base}.md`), {
      caption: "Same report as markdown. Select all, copy, paste into Cursor.",
    });
  } catch (error) {
    console.error(error);
    await ctx.reply("I have the full report, but Telegram would not take the file. Try /audit again in a second.");
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
