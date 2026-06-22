import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { CarRepository } from "@/repositories/carRepository";
import { sendCarReminderEmail } from "@/services/carEmailService";

const PREFIX = "car:reminder:";
const INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // ponytail: 3 days in ms, single source of truth
const TTL_SEC = 30 * 24 * 60 * 60; // match Auth Center token TTL

type ReminderEntry = { fireAt: number; token?: string };

export const CarReminderService = {
  async schedule(carId: string, accessToken?: string | null): Promise<void> {
    const entry: ReminderEntry = { fireAt: Date.now() + INTERVAL_MS, ...(accessToken ? { token: accessToken } : {}) };
    await redis.set(`${PREFIX}${carId}`, JSON.stringify(entry), "EX", TTL_SEC);
  },

  async cancel(carId: string): Promise<void> {
    await redis.del(`${PREFIX}${carId}`);
  },

  /** Called by cron job. Returns counts for observability. */
  async processAllDue(): Promise<{ sent: number; cancelled: number }> {
    const keys = await redis.keys(`${PREFIX}*`);
    const carRepo = new CarRepository();
    const now = Date.now();
    let sent = 0;
    let cancelled = 0;

    for (const key of keys) {
      const carId = key.slice(PREFIX.length);
      const val = await redis.get(key);
      if (!val) continue;

      let entry: ReminderEntry;
      try {
        entry = JSON.parse(val) as ReminderEntry;
      } catch {
        // ponytail: migrate old string-format entries written before this change
        const fireAt = parseInt(val, 10);
        if (isNaN(fireAt) || fireAt > now) continue;
        entry = { fireAt };
      }

      if (entry.fireAt > now) continue;

      const car = await carRepo.findForIssue(carId);
      if (!car || car.status !== "ISSUED") {
        await redis.del(key);
        cancelled++;
        continue;
      }

      const targets = car.targetEmailGroups ?? [];
      const cc = car.targetEmailGroupsCc ?? [];
      for (const email of targets) {
        sendCarReminderEmail({ carId, carNo: car.carNo, targetEmail: email, cc, senderAccessToken: entry.token }).catch((err) =>
          logger.error("[CarReminderService] email failed", { carId, email, error: String(err) })
        );
        await carRepo.createNotificationLog({ carMasterId: carId, type: "REMINDER", recipient: email });
      }

      if (targets.length > 0) sent++;
      // keep token for next round
      const next: ReminderEntry = { fireAt: now + INTERVAL_MS, ...(entry.token ? { token: entry.token } : {}) };
      await redis.set(key, JSON.stringify(next), "EX", TTL_SEC);
    }

    return { sent, cancelled };
  },
};
