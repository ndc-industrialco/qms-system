export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOfficePreviewUrl } from "@/lib/sharepoint";
import { AppError } from "@/lib/errors";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAuth();
    const itemId = req.nextUrl.searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ data: null, error: "itemId is required" }, { status: 400 });
    }

    const embedUrl = await getOfficePreviewUrl(itemId);
    return NextResponse.json({ data: embedUrl, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/sharepoint/office-embed]", err);
    return NextResponse.json({ data: null, error: "Failed to get Office embed URL" }, { status: 500 });
  }
}
