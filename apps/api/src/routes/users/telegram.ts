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
    const telegramUsername = asOptionalString(request.body?.telegram_username) ?? null;
    const now = new Date();

    const comp = isCompPremium(telegramUsername);
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
      if (isCompPremium(user.telegramUsername) && (user.tier !== "premium" || user.tierExpiresAt != null)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: lifetimePremiumWrite(),
        });
      }
      return { billing: toBillingSnapshot(user) };
    },
  );
}
