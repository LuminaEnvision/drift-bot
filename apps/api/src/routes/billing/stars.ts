import type { FastifyInstance } from "fastify";
import { prisma } from "@drift-bot/db";
import {
  PLAN_COPY,
  SUBSCRIPTION_PERIOD_SECONDS,
  addDays,
  canCheckout,
  isPaidPlan,
  planStars,
  resolveAccess,
  toBillingSnapshot,
} from "./entitlements.js";
import { HttpError, isUuid, parseTelegramUserId } from "../../http.js";

type TelegramUserBody = {
  telegram_user_id?: unknown;
  telegram_username?: unknown;
};

type CheckoutBody = TelegramUserBody & { plan?: unknown };

type PreCheckoutBody = TelegramUserBody & {
  payload?: unknown;
  currency?: unknown;
  total_amount?: unknown;
};

type CompleteBody = PreCheckoutBody & {
  telegram_payment_charge_id?: unknown;
  provider_payment_charge_id?: unknown;
  is_recurring?: unknown;
  is_first_recurring?: unknown;
  subscription_expiration_date?: unknown;
};

async function loadUser(telegramUserId: bigint) {
  const user = await prisma.user.findUnique({
    where: { telegramUserId },
  });
  if (!user) {
    throw new HttpError(404, "user not found");
  }
  return user;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

export async function registerStarsBillingRoutes(app: FastifyInstance) {
  app.post<{ Body: CheckoutBody }>("/payments/stars/checkout", async (request) => {
    const telegramUserId = parseTelegramUserId(request.body?.telegram_user_id);
    const planRaw = String(request.body?.plan ?? "");
    if (!isPaidPlan(planRaw)) {
      throw new HttpError(400, "plan must be paid or premium");
    }
    const plan = planRaw;

    const user = await loadUser(telegramUserId);
    const access = resolveAccess(user);
    const blocked = canCheckout(access, plan);
    if (blocked) {
      throw new HttpError(409, blocked);
    }

    const stars = planStars(plan);
    const session = await prisma.checkoutSession.create({
      data: { userId: user.id, plan, stars },
    });
    const copy = PLAN_COPY[plan];

    return {
      invoice: {
        title: copy.title,
        description: copy.description,
        payload: session.id,
        currency: "XTR",
        prices: [{ label: `${copy.title} · 30 days`, amount: stars }],
        subscription_period: SUBSCRIPTION_PERIOD_SECONDS,
      },
    };
  });

  app.post<{ Body: PreCheckoutBody }>("/payments/stars/pre-checkout", async (request) => {
    const telegramUserId = parseTelegramUserId(request.body?.telegram_user_id);
    const payload = asOptionalString(request.body?.payload);
    const currency = asOptionalString(request.body?.currency);
    const totalAmount = request.body?.total_amount;

    if (!payload) {
      return { ok: false, error: "Missing invoice payload." };
    }
    if (!isUuid(payload)) {
      return { ok: false, error: "This invoice is no longer valid." };
    }
    if (currency !== "XTR") {
      return { ok: false, error: "Pay with Telegram Stars." };
    }

    const user = await loadUser(telegramUserId);
    const session = await prisma.checkoutSession.findUnique({
      where: { id: payload },
    });
    if (!session || session.userId !== user.id) {
      return { ok: false, error: "This invoice is no longer valid." };
    }
    if (typeof totalAmount !== "number" || totalAmount !== session.stars) {
      return { ok: false, error: "Price mismatch." };
    }

    return { ok: true };
  });

  app.post<{ Body: CompleteBody }>("/payments/stars/complete", async (request) => {
    const telegramUserId = parseTelegramUserId(request.body?.telegram_user_id);
    const payload = asOptionalString(request.body?.payload);
    const chargeId = asOptionalString(request.body?.telegram_payment_charge_id);
    const currency = asOptionalString(request.body?.currency) ?? "XTR";
    const totalAmount = request.body?.total_amount;

    if (!payload || !chargeId) {
      throw new HttpError(400, "payload and telegram_payment_charge_id are required");
    }
    if (!isUuid(payload)) {
      throw new HttpError(400, "invalid checkout session");
    }

    const user = await loadUser(telegramUserId);
    const session = await prisma.checkoutSession.findUnique({
      where: { id: payload },
    });
    if (!session || session.userId !== user.id) {
      throw new HttpError(400, "invalid checkout session");
    }
    if (typeof totalAmount !== "number" || totalAmount !== session.stars) {
      throw new HttpError(400, "price mismatch");
    }

    const now = new Date();
    const expirationUnix = request.body?.subscription_expiration_date;
    const subscriptionExpiresAt =
      typeof expirationUnix === "number" ? new Date(expirationUnix * 1000) : addDays(now, 30);

    const billing = await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { telegramPaymentChargeId: chargeId },
      });
      if (existing) {
        const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
        return toBillingSnapshot(current, now);
      }

      await tx.payment.create({
        data: {
          userId: user.id,
          checkoutSessionId: session.id,
          telegramPaymentChargeId: chargeId,
          providerPaymentChargeId: asOptionalString(request.body?.provider_payment_charge_id) ?? "",
          currency,
          stars: session.stars,
          plan: session.plan,
          isRecurring: asBoolean(request.body?.is_recurring),
          isFirstRecurring: asBoolean(request.body?.is_first_recurring),
          subscriptionExpiresAt,
        },
      });

      await tx.checkoutSession.update({
        where: { id: session.id },
        data: { completedAt: now },
      });

      const firstCharge = asBoolean(request.body?.is_first_recurring) || !user.starChargeId;
      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          tier: session.plan,
          tierExpiresAt: subscriptionExpiresAt,
          ...(firstCharge ? { starChargeId: chargeId } : {}),
        },
      });

      return toBillingSnapshot(updated, now);
    });

    return { billing };
  });
}
