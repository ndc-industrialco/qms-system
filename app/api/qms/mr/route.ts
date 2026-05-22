export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getAllUsers } from "@/services/user";
import type { ApiResponse } from "@/types/api";
import type { UserWithDept } from "@/types/user";

export async function GET(): Promise<NextResponse<ApiResponse<UserWithDept[]>>> {
  try {
    await requireRole("QMS", "IT");
    const users = await getAllUsers();
    return NextResponse.json({ data: users, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/qms/mr]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
