export const runtime = 'edge';

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getActiveDepartments } from "@/services/department";
import type { ApiResponse } from "@/types/api";

export async function GET(): Promise<NextResponse<ApiResponse<{ id: string; name: string }[]>>> {
  try {
    await requireAuth();
    const departments = await getActiveDepartments();
    return NextResponse.json({ data: departments, error: null }, { headers: { "Cache-Control": "s-maxage=3600" } });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ data: null, error }, { status: 500 });
  }
}
