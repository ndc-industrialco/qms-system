export const runtime = 'nodejs';

import { requireAuth } from "@/lib/auth";
import { getFileInfo, getOfficePreviewUrl } from "@/lib/sharepoint";
import { AppError } from "@/lib/errors";
import { z } from "zod";

const OFFICE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

const Schema = z.object({
  itemId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const parsed = Schema.safeParse({ itemId: searchParams.get("itemId") });

    if (!parsed.success) {
      return Response.json({ data: null, error: "itemId is required" }, { status: 400 });
    }

    const info = await getFileInfo(parsed.data.itemId);

    let officeEmbedUrl: string | null = null;
    if (OFFICE_MIMES.has(info.mimeType)) {
      officeEmbedUrl = await getOfficePreviewUrl(parsed.data.itemId);
    }

    return Response.json({
      data: { ...info, officeEmbedUrl },
      error: null,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ data: null, error: message }, { status: 500 });
  }
}
