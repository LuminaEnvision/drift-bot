import type { Bot } from "grammy";
import { tickDigest } from "../backend.js";
import { chunkTelegram } from "../formatters/audit.js";
import { formatDigest } from "../formatters/digest.js";

const HOUR_MS = 60 * 60 * 1000;

export function startDigestScheduler(bot: Bot) {
  if (process.env.DIGEST_SCHEDULER === "0") {
    console.log("Digest scheduler is off (DIGEST_SCHEDULER=0)");
    return;
  }

  const intervalMs = Number(process.env.DIGEST_TICK_MS ?? HOUR_MS);
  const delayMs = Number(process.env.DIGEST_START_DELAY_MS ?? 30_000);

  const tick = async () => {
    try {
      const { deliveries, checked } = await tickDigest();
      if (checked > 0) {
        console.log(`Digest tick checked ${checked} repo${checked === 1 ? "" : "s"}, sent ${deliveries.length}`);
      }
      for (const item of deliveries) {
        try {
          for (const chunk of chunkTelegram(formatDigest(item.report))) {
            await bot.api.sendMessage(item.telegram_user_id, chunk);
          }
        } catch (error) {
          console.error(`Couldn't send digest to ${item.telegram_user_id}`, error);
        }
      }
    } catch (error) {
      console.error("Digest tick failed", error);
    }
  };

  setTimeout(() => {
    void tick();
    setInterval(() => {
      void tick();
    }, Number.isFinite(intervalMs) && intervalMs >= 10_000 ? intervalMs : HOUR_MS);
  }, Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 30_000);

  console.log("Digest scheduler on. Cheap CVE + CI check, hourly tick.");
}
