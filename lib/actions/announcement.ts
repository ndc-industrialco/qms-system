"use server";

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { announcements } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import type { DisplayType } from "@/db/schema";

const ANNOUNCEMENT_EXPIRY_DAYS = 7;

const createAnnouncementSchema = z.object({
  title: z.string().min(1, "กรุณาระบุหัวข้อ").max(255),
  content: z.string().min(1, "กรุณาระบุเนื้อหา").max(5000),
  sourceSystem: z.string().max(100).optional().default("QMS"),
  displayType: z.enum(["LIST", "SCROLLING", "BANNER"]).default("LIST"),
  pushToCompanyCenter: z.boolean().default(false),
});

export async function createAnnouncement(formData: FormData) {
  const session = await requireAuth();

  if (session.user.role === "USER") {
    throw new ForbiddenError("Unauthorized: Only Admins/QMS/IT can post announcements.");
  }

  const rawData = {
    title: formData.get("title"),
    content: formData.get("content"),
    sourceSystem: formData.get("sourceSystem"),
    displayType: formData.get("displayType"),
    pushToCompanyCenter: formData.get("pushToCompanyCenter") === "on",
  };

  const parsed = createAnnouncementSchema.safeParse(rawData);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    throw new ValidationError(message);
  }

  const { title, content, sourceSystem, displayType, pushToCompanyCenter } = parsed.data;

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + ANNOUNCEMENT_EXPIRY_DAYS);

  await db.insert(announcements).values({
    title,
    content,
    sourceSystem,
    displayType: displayType as DisplayType,
    pushToCompanyCenter,
    expiryDate,
    createdById: session.user.id,
  });

  revalidatePath("/");
}
