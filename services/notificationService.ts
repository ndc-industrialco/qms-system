import { NotificationLogRepository } from "@/repositories/notificationLogRepository";
import { logger } from "@/lib/logger";

const notifRepo = new NotificationLogRepository();

export class NotificationService {
  /**
   * Send an email exactly once per idempotency key.
   *
   * If the key has already been SENT, the call is a no-op.
   * If it is PENDING or FAILED (from a previous attempt), it will retry.
   *
   * Key convention:  {RESOURCE_TYPE}:{resourceId}:{EVENT}:{recipientId}
   * e.g.  "KPI:abc123:SUBMITTED:reviewer:user456"
   */
  static async sendEmailOnce(
    idempotencyKey: string,
    sendFn: () => Promise<void>,
    recipient: string,
    subject: string,
  ): Promise<void> {
    const existing = await notifRepo.findByIdempotencyKey(idempotencyKey);

    if (existing?.status === "SENT") {
      logger.info("[notification] Skipped duplicate send", { idempotencyKey, recipient });
      return;
    }

    const log = existing ?? (await notifRepo.create({
      idempotencyKey,
      channel: "EMAIL",
      status: "PENDING",
      recipient,
      subject,
    }));

    try {
      await sendFn();
      await notifRepo.markSent(log.id);
      logger.info("[notification] Email sent", { idempotencyKey, recipient });
    } catch (error) {
      await notifRepo.markFailed(log.id, error instanceof Error ? error.message : String(error));
      logger.error("[notification] Email failed", { idempotencyKey, recipient, error });
      throw error;
    }
  }
}
