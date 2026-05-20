export const runtime = 'edge';

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { AppError, NotFoundError } from "@/lib/errors";
import { updateDepartment, deleteDepartment } from "@/services/department";
import type { ApiResponse } from "@/types/api";
import type { DepartmentRow } from "@/types/department";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  emailGroup: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<DepartmentRow>>> {
  try {
    await requireRole("IT");
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 },
      );
    }
    const dept = await updateDepartment(id, parsed.data);
    return NextResponse.json({ data: dept, error: null });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ data: null, error: err.message }, { status: 404 });
    }
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    await requireRole("IT");
    const { id } = await params;
    await deleteDepartment(id);
    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    if (err instanceof NotFoundError) {
      return NextResponse.json({ data: null, error: err.message }, { status: 404 });
    }
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
