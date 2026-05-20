export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOfficePreviewUrl } from "@/lib/sharepoint";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ data: null, error: "itemId is required" }, { status: 400 });
    }

    const embedUrl = await getOfficePreviewUrl(itemId);
    return NextResponse.json({ data: embedUrl, error: null });
  } catch (err) {
    console.error("[GET /api/sharepoint/office-embed]", err);
    return NextResponse.json({ data: null, error: "Failed to get Office embed URL" }, { status: 500 });
  }
}
