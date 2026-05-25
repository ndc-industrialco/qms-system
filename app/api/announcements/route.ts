
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";

const SCROLLING_EXPIRY_DAYS = 7;

const createAnnouncementSchema = z.object({
  title: z.string().min(1, "กรุณาระบุหัวข้อ").max(255),
  content: z.string().min(1, "กรุณาระบุเนื้อหา").max(5000),
  sourceSystem: z.string().max(100).optional().default("QMS"),
  displayType: z.enum(["LIST", "SCROLLING"]).default("LIST"),
  pushToCompanyCenter: z.boolean().default(false),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  spItemId: z.string().optional().nullable(),
  spWebUrl: z.string().url().optional().nullable(),
  spDownloadUrl: z.string().url().optional().nullable(),
  fileName: z.string().max(255).optional().nullable(),
  mimeType: z.string().max(100).optional().nullable(),
  bgColor: z.string().max(20).optional().nullable(),
  bgImageUrl: z.string().url().optional().nullable(),
  bgImageSpId: z.string().optional().nullable(),
  textColor: z.string().max(20).optional().nullable(),
});

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    const session = await requireRole("QMS", "IT", "MR");

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
      bgColor: formData.get("bgColor") || null,
      bgImageUrl: formData.get("bgImageUrl") || null,
      bgImageSpId: formData.get("bgImageSpId") || null,
      textColor: formData.get("textColor") || null,
    };

    const parsed = createAnnouncementSchema.safeParse(rawData);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
      return NextResponse.json({ data: null, error: message }, { status: 400 });
    }

    const {
      title, content, sourceSystem, displayType, pushToCompanyCenter,
      startDate, endDate, spItemId, spWebUrl, spDownloadUrl, fileName, mimeType,
      bgColor, bgImageUrl, bgImageSpId, textColor,
    } = parsed.data;

    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    let expiryDate: Date | null = parsedEndDate;
    if (displayType === "SCROLLING" && !expiryDate) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + SCROLLING_EXPIRY_DAYS);
    }

    const row = await db.announcement.create({
      data: {
        title, content, sourceSystem, displayType, pushToCompanyCenter,
        startDate: parsedStartDate, endDate: parsedEndDate, expiryDate,
        spItemId, spWebUrl, spDownloadUrl, fileName, mimeType,
        bgColor, bgImageUrl, bgImageSpId, textColor,
        createdById: session.user.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ data: { id: row.id }, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ data: null, error: error.message }, { status: error.statusCode });
    }
    console.error("[POST /api/announcements]", error);
    return NextResponse.json({ data: null, error: "Failed to create announcement" }, { status: 500 });
  }
}
