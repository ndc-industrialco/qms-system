export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { AppError, ValidationError } from "@/lib/errors";
import { getDarsByRequesterId, createDar, submitDar } from "@/services/dar";
import type { ApiResponse } from "@/types/api";
import type { DarSummary, DarDetail } from "@/types/dar";

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const createSchema = z.object({
  objective: z.enum(["PREPARE_NEW", "REQUEST_COPY_CONTROLLED", "REQUEST_COPY_UNCONTROLLED", "REVISE", "CANCEL"]),
  docType: z.enum(["MANUAL", "FORMAT", "DRAWING", "PROCEDURE", "SOP", "SIP", "IPQC", "OTHER"]),
  docTypeOther: z.string().max(100).optional(),
  reason: z.string().min(1, "à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¹€à¸«à¸•à¸¸à¸œà¸¥").max(2000),
  items: z.array(z.object({
    docNumber: z.string().min(1, "à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¹€à¸¥à¸‚à¸—à¸µà¹ˆà¹€à¸­à¸à¸ªà¸²à¸£").max(100),
    docName: z.string().min(1, "à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¸Šà¸·à¹ˆà¸­à¹€à¸­à¸à¸ªà¸²à¸£").max(255),
    revision: z.string().min(1, "à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸ Revision").max(50),
  })).min(1, "à¸•à¹‰à¸­à¸‡à¸¡à¸µà¹€à¸­à¸à¸ªà¸²à¸£à¸­à¸¢à¹ˆà¸²à¸‡à¸™à¹‰à¸­à¸¢ 1 à¸£à¸²à¸¢à¸à¸²à¸£"),
  distributionDepartmentIds: z.array(z.string().uuid()).default([]),
  action: z.enum(["DRAFT", "SUBMIT"]).default("DRAFT"),
  tempAttachments: z.array(z.object({
    spItemId: z.string().min(1),
    spWebUrl: z.string().url(),
    spDownloadUrl: z.string().url(),
    folderPath: z.string().min(1),
    fileName: z.string().min(1).max(255),
    fileSize: z.number().int().min(1),
    mimeType: z.string().min(1),
  })).default([]),
});

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<DarSummary[]>>> {
  try {
    const session = await requireAuth();
    const { searchParams } = req.nextUrl;
    const parsed = querySchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Invalid query parameters" }, { status: 400 });
    }

    const { page, limit } = parsed.data;
    const { dars, total } = await getDarsByRequesterId(session.user.id, page, limit);

    return NextResponse.json(
      { data: dars, error: null, meta: { page, limit, total } },
      { headers: { "Cache-Tag": "dar-list" } },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/dar]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<DarDetail>>> {
  try {
    const session = await requireAuth();

    if (!session.user.departmentId) {
      return NextResponse.json(
        { data: null, error: "à¸šà¸±à¸à¸Šà¸µà¸‚à¸­à¸‡à¸„à¸¸à¸“à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸œà¸¹à¸à¸à¸±à¸šà¹à¸œà¸™à¸ à¸à¸£à¸¸à¸“à¸²à¸•à¸´à¸”à¸•à¹ˆà¸­ IT" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? "Invalid request body";
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const { action, ...input } = parsed.data;

    if (input.docType === "OTHER" && !input.docTypeOther?.trim()) {
      throw new ValidationError("à¸à¸£à¸¸à¸“à¸²à¸£à¸°à¸šà¸¸à¸›à¸£à¸°à¹€à¸ à¸—à¹€à¸­à¸à¸ªà¸²à¸£ (à¸­à¸·à¹ˆà¸™à¹†)");
    }

    let dar = await createDar(session.user.id, session.user.departmentId, {
      ...input,
      tempAttachments: parsed.data.tempAttachments,
    });

    if (action === "SUBMIT") {
      dar = await submitDar(dar.id, session.user.id);
    }

    revalidateTag("dar-list");

    return NextResponse.json({ data: dar, error: null }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[POST /api/dar]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

