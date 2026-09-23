import type { FastifyInstance } from "fastify";
import { prisma } from "@drift-bot/db";
import { isCompPremium, lifetimePremiumWrite } from "../billing/comps.js";
import { addDays, toBillingSnapshot, trialDays } from "../billing/entitlements.js";
import { HttpError, parseTelegramUserId } from "../../http.js";

type TelegramUserBody = {
  telegram_user_id?: unknown;
  telegram_username?: unknown;
};

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function registerUserRoutes(app: FastifyInstance) {
  app.post<{ Body: TelegramUserBody }>("/users/telegram", async (request) => {
    const telegramUserId = parseTelegramUserId(request.body?.telegram_user_id);
    const incomingUsername = asOptionalString(request.body?.telegram_username) ?? null;
    const now = new Date();
    const existing = await prisma.user.findUnique({ where: { telegramUserId } });
    const telegramUsername = incomingUsername ?? existing?.telegramUsername ?? null;
    const comp = isCompPremium(telegramUsername, telegramUserId);
    request.log.info(
      { telegramUserId: telegramUserId.toString(), telegramUsername, comp },
      "upsert telegram user",
    );

    const user = await prisma.user.upsert({
      where: { telegramUserId },
      create: {
        telegramUserId,
        telegramUsername,
        trialEndsAt: addDays(now, trialDays()),
        ...(comp ? lifetimePremiumWrite() : {}),
      },
      update: {
        telegramUsername,
        ...(comp ? lifetimePremiumWrite() : {}),
      },
    });

    return { billing: toBillingSnapshot(user, now) };
  });

  app.get<{ Params: { telegramUserId: string } }>(
    "/users/:telegramUserId/billing",
    async (request) => {
      const telegramUserId = parseTelegramUserId(request.params.telegramUserId);
      let user = await prisma.user.findUnique({
        where: { telegramUserId },
      });
      if (!user) {
        throw new HttpError(404, "user not found");
      }
      if (
        isCompPremium(user.telegramUsername, user.telegramUserId) &&
        (user.tier !== "premium" || user.tierExpiresAt != null)
      ) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: lifetimePremiumWrite(),
        });
      }
      return { billing: toBillingSnapshot(user) };
    },
  );
}
