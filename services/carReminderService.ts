import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { CarRepository } from "@/repositories/carRepository";
import { sendCarReminderEmail } from "@/services/carEmailService";

const PREFIX = "car:reminder:";
const INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // ponytail: 3 days in ms, single source of truth

export const CarReminderService = {
  async schedule(carId: string): Promise<void> {
    await redis.set(`${PREFIX}${carId}`, String(Date.now() + INTERVAL_MS));
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
      if (!val || parseInt(val, 10) > now) continue;

      const car = await carRepo.findForIssue(carId);
      if (!car || car.status !== "ISSUED") {
        await redis.del(key);
        cancelled++;
        continue;
      }

      const targets = car.targetEmailGroups ?? [];
      const cc = car.targetEmailGroupsCc ?? [];
      for (const email of targets) {
        sendCarReminderEmail({ carId, carNo: car.carNo, targetEmail: email, cc }).catch((err) =>
          logger.error("[CarReminderService] email failed", { carId, email, error: String(err) })
        );
        await carRepo.createNotificationLog({ carMasterId: carId, type: "REMINDER", recipient: email });
      }

      if (targets.length > 0) sent++;
      await redis.set(key, String(now + INTERVAL_MS));
    }

    return { sent, cancelled };
  },
};
