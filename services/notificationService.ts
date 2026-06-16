import { NotificationLogRepository } from "@/repositories/notificationLogRepository";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { logger } from "@/lib/logger";
import { getUserSnapshot } from "@/lib/userSnapshotCache";

const notifRepo = new NotificationLogRepository();
const notificationRepo = new NotificationRepository();

export class NotificationService {
  /**
   * Resolve whether a user should receive email or in-app notification.
   * Users with m365Linked flag receive email; otherwise in-app.
   */
  static async resolveChannel(authUserId: string): Promise<"email" | "in_app"> {
    const cached = await getUserSnapshot(authUserId);
    if (cached) {
      return cached.m365Linked ? "email" : "in_app";
    }
    // Default to email when cache miss (user hasn't logged in yet)
    return "email";
  }

  /**
   * Create an in-app notification record.
   */
  static async createInAppNotification(data: {
    recipientId: string;
    recipientAuthUserId?: string | null;
    title: string;
    body: string;
    module: string;
    resourceId: string;
    resourceType: string;
  }) {
    return notificationRepo.create(data);
  }

  /**
   * Send an email exactly once per idempotency key.
   *
   * If the key has already been SENT, the call is a no-op.
   * If it is PENDING or FAILED (from a previous attempt), it will retry.
   *
   * When recipientUserId is provided, the channel is resolved:
   * - "email": proceed with sendFn as normal
   * - "in_app": create Notification record, skip sendFn
   *
   * Key convention:  {RESOURCE_TYPE}:{resourceId}:{EVENT}:{recipientId}
   * e.g.  "KPI:abc123:SUBMITTED:reviewer:user456"
   */
  static async sendEmailOnce(
    idempotencyKey: string,
    sendFn: () => Promise<void>,
    recipient: string,
    subject: string,
    recipientUserId?: string,
    notificationData?: {
      title: string;
      body: string;
      module: string;
      resourceId: string;
      resourceType: string;
    },
  ): Promise<void> {
    const existing = await notifRepo.findByIdempotencyKey(idempotencyKey);

    if (existing?.status === "SENT") {
      logger.info("[notification] Skipped duplicate send", { idempotencyKey, recipient });
      return;
    }

    // Resolve channel when a recipientUserId is provided
    if (recipientUserId && notificationData) {
      const channel = await NotificationService.resolveChannel(recipientUserId);

      if (channel === "in_app") {
        // Create in-app notification
        await NotificationService.createInAppNotification({
          recipientId: recipientUserId,
          ...notificationData,
        });

        // Log to NotificationLog so idempotency key is recorded
        await notifRepo.create({
          idempotencyKey,
          channel: "IN_APP",
          status: "SENT",
          recipient,
          subject,
        });

        logger.info("[notification] In-app notification created", { idempotencyKey, recipientUserId });
        return;
      }
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
