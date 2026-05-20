export const runtime = 'edge';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getAllUsers } from "@/services/user";
import type { ApiResponse } from "@/types/api";
import type { UserWithDept } from "@/types/user";

/**
 * GET /api/it/users
 *
 * Returns all users in the database with their department.
 * Restricted to IT role.
 */
export async function GET(): Promise<NextResponse<ApiResponse<UserWithDept[]>>> {
  try {
    await requireRole("IT");

    const users = await getAllUsers();
    return NextResponse.json({ data: users, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
