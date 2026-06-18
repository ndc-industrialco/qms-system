import { NotificationRepository } from "@/repositories/notificationRepository";
import { logger } from "@/lib/logger";

const repo = new NotificationRepository();

export type CarNotifEvent =
  | "ISSUED"
  | "RESPONDED"
  | "MR_REVIEW"
  | "PLAN_APPROVED"
  | "PLAN_REJECTED"
  | "VERIFY_1_PASS"
  | "VERIFY_2_SCHEDULED"
  | "CLOSED"
  | "RE_CAR"
  | "REMINDER";

const TITLES: Record<CarNotifEvent, string> = {
  ISSUED:              "CAR ออกแล้ว",
  RESPONDED:           "แผนกตอบกลับ CAR แล้ว",
  MR_REVIEW:           "รออนุมัติแผนแก้ไข CAR",
  PLAN_APPROVED:       "แผนแก้ไขได้รับการอนุมัติ",
  PLAN_REJECTED:       "แผนแก้ไขถูกปฏิเสธ — กรุณาแก้ไขใหม่",
  VERIFY_1_PASS:       "CAR ผ่านการติดตาม — กรุณาลงนาม",
  VERIFY_2_SCHEDULED:  "กำหนดการติดตามครั้งที่ 2",
  CLOSED:              "ปิด CAR แล้ว",
  RE_CAR:              "ออก Re-CAR ใหม่",
  REMINDER:            "เตือน: CAR ยังไม่ได้ตอบกลับ",
};

/** helper — true if snapshot unknown (assume can receive email) or m365Linked */
export function canReceiveEmail(m365Linked: boolean | null | undefined): boolean {
  return m365Linked !== false; // null/undefined → assume yes
}

export async function notifyCarUser(opts: {
  recipientAuthUserId: string;
  event: CarNotifEvent;
  carNo: string;
  carId: string;
  body?: string;
}): Promise<void> {
  const body = opts.body ?? `CAR หมายเลข ${opts.carNo}`;
  await repo.create({
    recipientId: opts.recipientAuthUserId,
    recipientAuthUserId: opts.recipientAuthUserId,
    title: `${TITLES[opts.event]} — ${opts.carNo}`,
    body,
    module: "CAR",
    resourceId: opts.carId,
    resourceType: "CAR",
  }).catch((err) => {
    logger.error("[carNotification] failed to create notification", {
      event: opts.event,
      carNo: opts.carNo,
      recipientAuthUserId: opts.recipientAuthUserId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
