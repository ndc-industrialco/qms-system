export const runtime = 'nodejs';

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { DisplayType } from "@/app/generated/prisma";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();

    if (!["QMS", "IT", "MR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const sourceSystem = formData.get("sourceSystem") as string;
    const displayType = formData.get("displayType") as DisplayType;
    const pushToCompanyCenter = formData.get("pushToCompanyCenter") === "true";
    
    const startDateRaw = formData.get("startDate") as string;
    const endDateRaw = formData.get("endDate") as string;
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const endDate = endDateRaw ? new Date(endDateRaw) : null;

    // Attachments
    const spItemId = formData.get("spItemId") as string | null;
    const spWebUrl = formData.get("spWebUrl") as string | null;
    const spDownloadUrl = formData.get("spDownloadUrl") as string | null;
    const fileName = formData.get("fileName") as string | null;
    const mimeType = formData.get("mimeType") as string | null;

    // For scrolling, set default expiry to +7 days if no endDate is provided
    let expiryDate = endDate;
    if (displayType === "SCROLLING" && !expiryDate) {
      const exp = new Date();
      exp.setDate(exp.getDate() + 7);
      expiryDate = exp;
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        sourceSystem,
        displayType: displayType || "LIST",
        pushToCompanyCenter,
        startDate,
        endDate,
        expiryDate,
        spItemId,
        spWebUrl,
        spDownloadUrl,
        fileName,
        mimeType,
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: announcement });
  } catch (error: any) {
    console.error("Failed to create announcement:", error);
    return NextResponse.json({ error: error.message || "Failed to create announcement" }, { status: 500 });
  }
}
