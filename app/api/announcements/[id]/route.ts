export const runtime = 'nodejs';

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { getAnnouncement, updateAnnouncement, deleteAnnouncement, toggleAnnouncementActive } from "@/services/announcement";
import type { ApiResponse } from "@/types/api";

const updateSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(5000),
  sourceSystem: z.string().max(100).default("QMS"),
  displayType: z.enum(["LIST", "SCROLLING"]).default("LIST"),
  pushToCompanyCenter: z.boolean().default(false),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  endDate: z.string().datetime({ offset: true }).optional().nullable(),
  bgColor: z.string().max(20).optional().nullable(),
  bgImageUrl: z.string().url().optional().nullable(),
  bgImageSpId: z.string().optional().nullable(),
  textColor: z.string().max(20).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const { id } = await params;
    await requireRole("QMS", "IT", "MR");

    const row = await getAnnouncement(id);

    return NextResponse.json({ data: row, error: null });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ data: null, error: error.message }, { status: error.statusCode });
    }
    console.error("[GET /api/announcements/[id]]", error);
    return NextResponse.json({ data: null, error: "Failed to fetch announcement" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    const { id } = await params;
    await requireRole("QMS", "IT", "MR");

    const body: unknown = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }

    const { title, content, sourceSystem, displayType, pushToCompanyCenter, startDate, endDate,
      bgColor, bgImageUrl, bgImageSpId, textColor } = parsed.data;

    const updated = await updateAnnouncement(id, {
      title, content, sourceSystem, displayType, pushToCompanyCenter,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      bgColor, bgImageUrl, bgImageSpId, textColor,
    });

    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ data: null, error: error.message }, { status: error.statusCode });
    }
    console.error("[PUT /api/announcements/[id]]", error);
    return NextResponse.json({ data: null, error: "Failed to update announcement" }, { status: 500 });
  }
}

const toggleSchema = z.object({ active: z.boolean() }); // maps to status ACTIVE/INACTIVE

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    const { id } = await params;
    await requireRole("QMS", "IT", "MR");

    const body: unknown = await req.json();
    const parsed = toggleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }

    const updated = await toggleAnnouncementActive(id, parsed.data.active);
    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ data: null, error: error.message }, { status: error.statusCode });
    }
    console.error("[PATCH /api/announcements/[id]]", error);
    return NextResponse.json({ data: null, error: "Failed to toggle announcement" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    const { id } = await params;
    await requireRole("QMS", "IT", "MR");

    await deleteAnnouncement(id);

    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ data: null, error: error.message }, { status: error.statusCode });
    }
    console.error("[DELETE /api/announcements/[id]]", error);
    return NextResponse.json({ data: null, error: "Failed to delete announcement" }, { status: 500 });
  }
}
