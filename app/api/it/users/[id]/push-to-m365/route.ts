export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { db } from "@/lib/db";
import { users, departments } from "@/db/schema";
import { pushUserToEntra } from "@/services/ms-graph";
import type { ApiResponse } from "@/types/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<{ pushed: true }>>> {
  try {
    await requireRole("IT");
    const { id } = await params;

    const [user] = await db
      .select({ msUserId: users.msUserId, name: users.name, employeeId: users.employeeId, departmentId: users.departmentId })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ data: null, error: "ไม่พบผู้ใช้" }, { status: 404 });
    }
    if (!user.msUserId) {
      return NextResponse.json({ data: null, error: "ผู้ใช้นี้ยังไม่เชื่อมกับ Microsoft 365" }, { status: 400 });
    }

    let deptName: string | null = null;
    if (user.departmentId) {
      const [dept] = await db.select({ name: departments.name }).from(departments).where(eq(departments.id, user.departmentId)).limit(1);
      deptName = dept?.name ?? null;
    }

    await pushUserToEntra(user.msUserId, {
      displayName: user.name ?? undefined,
      department: deptName,
      employeeId: user.employeeId ?? null,
    });

    return NextResponse.json({ data: { pushed: true }, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[push-to-m365]", err);
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
