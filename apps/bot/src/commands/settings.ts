import { Bot, InlineKeyboard, type Context } from "grammy";
import {
  completeStarsPayment,
  createStarsCheckout,
  errorMessage,
  getBilling,
  preCheckoutStars,
  upsertUser,
  type Invoice,
  type PaidPlan,
} from "../backend.js";
import { formatBilling, formatLimits, HELP, welcomeText } from "../formatters/billing.js";

function requireFrom(ctx: { from?: { id: number; username?: string } }) {
  if (!ctx.from) {
    throw new Error("Telegram user is missing");
  }
  return ctx.from;
}

function upgradeKeyboard(billing: Awaited<ReturnType<typeof getBilling>>["billing"]) {
  const keyboard = new InlineKeyboard();
  for (const plan of billing.plans) {
    keyboard.text(`${plan.title}, ${plan.stars} Stars / 30 days`, `upgrade:${plan.id}`).row();
  }
  return keyboard;
}

async function sendStarsInvoice(ctx: Context, invoice: Invoice) {
  const link = await ctx.api.raw.createInvoiceLink({
    title: invoice.title,
    description: invoice.description,
    payload: invoice.payload,
    currency: invoice.currency,
    prices: invoice.prices,
    subscription_period: invoice.subscription_period,
  });
  await ctx.reply(`Here's checkout for ${invoice.title}. Pay with Stars. Telegram Wallet works.`, {
    reply_markup: new InlineKeyboard().url("Pay with Stars", link),
  });
}

export function registerSettings(bot: Bot) {
  bot.command("start", async (ctx) => {
    const from = requireFrom(ctx);
    try {
      console.log("telegram /start", from.id, from.username ?? "(no username)");
      const { billing } = await upsertUser(from.id, from.username);
      await ctx.reply(welcomeText(billing, { id: from.id, username: from.username }), {
        reply_markup: upgradeKeyboard(billing),
      });
    } catch (error) {
      console.error(error);
      await ctx.reply(
        errorMessage(error, "Couldn't start your trial. Give it a second and try /start again."),
      );
    }
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(HELP);
  });

  bot.command("tier", async (ctx) => {
    const from = requireFrom(ctx);
    try {
      await upsertUser(from.id, from.username);
      const { billing } = await getBilling(from.id);
      await ctx.reply(formatBilling(billing, { id: from.id, username: from.username }), {
        reply_markup: upgradeKeyboard(billing),
      });
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't load your plan. Try /tier again in a second."));
    }
  });

  bot.command("upgrade", async (ctx) => {
    const from = requireFrom(ctx);
    try {
      await upsertUser(from.id, from.username);
      const { billing } = await getBilling(from.id);
      await ctx.reply("Pick a plan. You pay with Stars, Telegram Wallet is fine.", {
        reply_markup: upgradeKeyboard(billing),
      });
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't load the plans. Try /upgrade again."));
    }
  });

  bot.callbackQuery(/^upgrade:(paid|premium)$/, async (ctx) => {
    const from = requireFrom(ctx);
    const plan = ctx.match[1] as PaidPlan;
    await ctx.answerCallbackQuery();
    try {
      const { invoice } = await createStarsCheckout(from.id, plan);
      await sendStarsInvoice(ctx, invoice);
    } catch (error) {
      console.error(error);
      await ctx.reply(errorMessage(error, "Couldn't open checkout. Try /upgrade again."));
    }
  });

  bot.on("pre_checkout_query", async (ctx) => {
    const query = ctx.preCheckoutQuery;
    try {
      const result = await preCheckoutStars({
        telegram_user_id: query.from.id,
        payload: query.invoice_payload,
        currency: query.currency,
        total_amount: query.total_amount,
      });
      if (result.ok) {
        await ctx.answerPreCheckoutQuery(true);
        return;
      }
      await ctx.answerPreCheckoutQuery(false, { error_message: result.error ?? "Checkout didn't go through." });
    } catch (error) {
      console.error(error);
      await ctx.answerPreCheckoutQuery(false, { error_message: "Couldn't check that payment. Try again." });
    }
  });

  bot.on("message:successful_payment", async (ctx) => {
    const from = requireFrom(ctx);
    const payment = ctx.message.successful_payment;
    try {
      const { billing } = await completeStarsPayment({
        telegram_user_id: from.id,
        payload: payment.invoice_payload,
        currency: payment.currency,
        total_amount: payment.total_amount,
        telegram_payment_charge_id: payment.telegram_payment_charge_id,
        provider_payment_charge_id: payment.provider_payment_charge_id,
        is_recurring: payment.is_recurring,
        is_first_recurring: payment.is_first_recurring,
        subscription_expiration_date: payment.subscription_expiration_date,
      });
      await ctx.reply(`You're on ${billing.tier === "premium" ? "Premium" : "Paid"} now. ${formatLimits(billing.limits)}`);
    } catch (error) {
      console.error(error);
      await ctx.reply(
        errorMessage(error, "Payment went through, but I couldn't save it. Check /tier in a minute."),
      );
    }
  });
}
