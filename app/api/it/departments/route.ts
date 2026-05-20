export const runtime = 'edge';

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getAllDepartments, createDepartment } from "@/services/department";
import type { ApiResponse } from "@/types/api";
import type { DepartmentRow } from "@/types/department";

const createSchema = z.object({
  name: z.string().min(1, "ชื่อแผนกต้องไม่ว่างเปล่า").max(100),
  emailGroup: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(): Promise<NextResponse<ApiResponse<DepartmentRow[]>>> {
  try {
    await requireRole("IT");
    const departments = await getAllDepartments();
    return NextResponse.json({ data: departments, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<DepartmentRow>>> {
  try {
    await requireRole("IT");
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 },
      );
    }
    const dept = await createDepartment(parsed.data);
    return NextResponse.json({ data: dept, error: null }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
