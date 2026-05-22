export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

const bodySchema = z.object({
  role: z.enum(["USER", "IT", "QMS", "MR"]).optional(),
  departmentId: z.string().nullable().optional(),
  employeeId: z.string().max(16).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<{ id: string; role: string }>>> {
  try {
    await requireRole("IT");
    const { id } = await params;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message ?? "Invalid body" }, { status: 400 });
    }

    const { role, departmentId, employeeId } = parsed.data;
    if (role === undefined && departmentId === undefined && employeeId === undefined) {
      return NextResponse.json({ data: null, error: "Nothing to update" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ data: null, error: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        ...(role !== undefined ? { role } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(employeeId !== undefined ? { employeeId: employeeId || null } : {}),
      },
      select: { id: true, role: true },
    });

    return NextResponse.json({ data: { id: updated.id, role: updated.role }, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[PATCH /api/it/users/[id]/role]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
