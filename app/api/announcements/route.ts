export const runtime = 'edge';

import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { AppError, ForbiddenError } from "@/lib/errors";
import type { DisplayType } from "@/app/generated/prisma/edge";
import type { ApiResponse } from "@/types/api";

const SCROLLING_EXPIRY_DAYS = 7;

const createAnnouncementSchema = z.object({
  title: z.string().min(1, "กรุณาระบุหัวข้อ").max(255),
  content: z.string().min(1, "กรุณาระบุเนื้อหา").max(5000),
  sourceSystem: z.string().max(100).optional().default("QMS"),
  displayType: z.enum(["LIST", "SCROLLING", "BANNER"]).default("LIST"),
  pushToCompanyCenter: z.boolean().default(false),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  spItemId: z.string().optional().nullable(),
  spWebUrl: z.string().url().optional().nullable(),
  spDownloadUrl: z.string().url().optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  mimeType: z.string().max(100).optional().nullable(),
});

export async function POST(req: Request): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    const session = await requireAuth();

    if (!["QMS", "IT", "MR"].includes(session.user.role)) {
      throw new ForbiddenError("Insufficient permissions to post announcements");
    }

    const formData = await req.formData();

    const rawData = {
      title: formData.get("title"),
      content: formData.get("content"),
      sourceSystem: formData.get("sourceSystem") ?? "QMS",
      displayType: formData.get("displayType"),
      pushToCompanyCenter: formData.get("pushToCompanyCenter") === "true",
      startDate: formData.get("startDate") || null,
      endDate: formData.get("endDate") || null,
      spItemId: formData.get("spItemId") || null,
      spWebUrl: formData.get("spWebUrl") || null,
      spDownloadUrl: formData.get("spDownloadUrl") || null,
      fileName: formData.get("fileName") || null,
      mimeType: formData.get("mimeType") || null,
    };

    const parsed = createAnnouncementSchema.safeParse(rawData);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
      return NextResponse.json({ data: null, error: message }, { status: 400 });
    }

    const {
      title, content, sourceSystem, displayType, pushToCompanyCenter,
      startDate, endDate, spItemId, spWebUrl, spDownloadUrl, fileName, mimeType,
    } = parsed.data;

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    // For scrolling announcements, set default expiry to +7 days if no endDate provided
    let expiryDate: Date | null = parsedEndDate;
    if (displayType === "SCROLLING" && !expiryDate) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + SCROLLING_EXPIRY_DAYS);
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        sourceSystem,
        displayType: displayType as DisplayType,
        pushToCompanyCenter,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        expiryDate,
        spItemId,
        spWebUrl,
        spDownloadUrl,
        fileName,
        mimeType,
        createdById: session.user.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: announcement.id }, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ data: null, error: error.message }, { status: error.statusCode });
    }
    console.error("[POST /api/announcements]", error);
    return NextResponse.json({ data: null, error: "Failed to create announcement" }, { status: 500 });
  }
}
