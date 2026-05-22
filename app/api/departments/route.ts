export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getActiveDepartments } from "@/services/department";
import type { ApiResponse } from "@/types/api";

export async function GET(): Promise<NextResponse<ApiResponse<{ id: string; name: string }[]>>> {
  try {
    await requireAuth();
    const departments = await getActiveDepartments();
    return NextResponse.json({ data: departments, error: null }, { headers: { "Cache-Control": "s-maxage=3600" } });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/departments]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
