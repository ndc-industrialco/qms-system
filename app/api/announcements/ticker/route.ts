
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import type { ApiResponse } from "@/types/api";

type TickerItem = { id: string; title: string; sourceSystem: string };

export async function GET(): Promise<NextResponse<ApiResponse<TickerItem[]>>> {
  try {
    await requireAuth();

    const now = new Date();

    const rows = await db.announcement.findMany({
      where: {
        displayType: "SCROLLING",
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          { OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] },
        ],
      },
      select: { id: true, title: true, sourceSystem: true },
      take: 20,
    });

    return NextResponse.json({ data: rows, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/announcements/ticker]", err);
    return NextResponse.json({ data: [], error: null });
  }
}
