import { Bot, InlineKeyboard, type Context } from "grammy";
import { parseRepoRef } from "@drift-bot/github-client";
import { connectRepo, disconnectRepo, errorMessage, listRepos, upsertUser } from "../backend.js";
import { formatConnected, formatRepoList } from "../formatters/audit.js";

function requireFrom(ctx: { from?: { id: number; username?: string } }) {
  if (!ctx.from) {
    throw new Error("Telegram user is missing");
  }
  return ctx.from;
}

async function handleConnect(ctx: Context, raw: string) {
  const from = requireFrom(ctx);
  await upsertUser(from.id, from.username);
  const ref = parseRepoRef(raw);
  if (!ref) {
    await ctx.reply("That doesn't look like a GitHub repo. Paste owner/repo or a github.com link.");
    return;
  }

  await ctx.reply(`Checking ${ref.fullName}...`);
  const { repo: connected } = await connectRepo(from.id, ref.fullName);
  await ctx.reply(formatConnected(connected));
}

export function registerRepos(bot: Bot) {
  bot.command("connect", async (ctx) => {
    const raw = typeof ctx.match === "string" ? ctx.match.trim() : "";
    try {
      if (!raw) {
        await ctx.reply("Paste a public GitHub repo. owner/repo or the github.com link is enough.");
        return;
      }
      await handleConnect(ctx, raw);
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't connect that repo. Try again."));
    }
  });

  bot.command("repos", async (ctx) => {
    const from = requireFrom(ctx);
    try {
      await upsertUser(from.id, from.username);
      const { repos } = await listRepos(from.id);
      await ctx.reply(formatRepoList(repos), {
        reply_markup: repos.length > 0 ? auditKeyboard(repos[0].full_name, repos.length === 1) : undefined,
      });
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't load your repos. Try /repos again."));
    }
  });

  bot.command("disconnect", async (ctx) => {
    const from = requireFrom(ctx);
    const repo = typeof ctx.match === "string" ? ctx.match.trim() : "";
    try {
      await upsertUser(from.id, from.username);
      if (!repo) {
        const { repos } = await listRepos(from.id);
        if (repos.length === 0) {
          await ctx.reply("Nothing to disconnect. Paste a repo or /connect owner/repo first.");
          return;
        }
        if (repos.length === 1) {
          const { repo: removed } = await disconnectRepo(from.id, repos[0].full_name);
          await ctx.reply(`Okay. I dropped ${removed.full_name}.`);
          return;
        }
        await ctx.reply("Which one? /disconnect owner/repo");
        return;
      }
      const { repo: removed } = await disconnectRepo(from.id, repo);
      await ctx.reply(`Okay. I dropped ${removed.full_name}.`);
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't drop that repo. Try /repos."));
    }
  });
}

/** Register after slash commands so a pasted repo does not swallow /audit_secrets and friends. */
export function registerPastedRepo(bot: Bot) {
  bot.on("message:text").filter(
    (ctx) => !ctx.message.text.startsWith("/"),
    async (ctx) => {
      try {
        if (!parseRepoRef(ctx.message.text)) {
          await ctx.reply("I need a public GitHub repo. Paste owner/repo or the github.com link.");
          return;
        }
        await handleConnect(ctx, ctx.message.text);
      } catch (error) {
        console.error(error);
        await ctx.reply(errorMessage(error, "Couldn't connect that repo. Try again."));
      }
    },
  );
}

function auditKeyboard(fullName: string, single: boolean) {
  if (!single) {
    return undefined;
  }
  const kinds = ["secrets", "deps", "code", "contracts", "full"] as const;
  if (kinds.some((kind) => `audit:${kind}:${fullName}`.length > 64)) {
    return undefined;
  }
  return new InlineKeyboard()
    .text("Secrets", `audit:secrets:${fullName}`)
    .text("Deps", `audit:deps:${fullName}`)
    .row()
    .text("Code", `audit:code:${fullName}`)
    .text("Contracts", `audit:contracts:${fullName}`)
    .row()
    .text("Break before launch", `audit:full:${fullName}`);
}
