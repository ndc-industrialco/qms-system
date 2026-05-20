"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { DisplayType } from "@/app/generated/prisma";

export async function createAnnouncement(formData: FormData) {
  const session = await requireAuth();
  
  if (session.user.role === "USER") {
    throw new Error("Unauthorized: Only Admins/QMS/IT can post announcements.");
  }

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const sourceSystem = formData.get("sourceSystem") as string;
  const displayType = formData.get("displayType") as DisplayType;
  const pushToCompanyCenter = formData.get("pushToCompanyCenter") === "on";
  
  // Expiry date logic (e.g. 7 days from now)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);

  await prisma.announcement.create({
    data: {
      title,
      content,
      sourceSystem,
      displayType: displayType || "LIST",
      pushToCompanyCenter,
      expiryDate,
      createdById: session.user.id,
    },
  });

  revalidatePath("/");
}
