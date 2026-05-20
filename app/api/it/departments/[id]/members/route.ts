export const runtime = 'edge';

import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getDepartmentWithMembers } from "@/services/department";
import type { ApiResponse } from "@/types/api";
import type { DepartmentDetail } from "@/services/department";

type Params = { params: Promise<{ id: string }> };

export async function GET(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<DepartmentDetail>>> {
  try {
    await requireRole("IT");
    const { id } = await params;
    const dept = await getDepartmentWithMembers(id);
    if (!dept) {
      return NextResponse.json({ data: null, error: "ไม่พบแผนก" }, { status: 404 });
    }
    return NextResponse.json({ data: dept, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/it/departments/[id]/members]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
