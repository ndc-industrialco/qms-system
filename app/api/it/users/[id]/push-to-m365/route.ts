
import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { db } from "@/lib/db";
import { pushUserToEntra } from "@/services/ms-graph";
import type { ApiResponse } from "@/types/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<{ pushed: true }>>> {
  try {
    await requireRole("IT");
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: { msUserId: true, name: true, employeeId: true, department: { select: { name: true } } },
    });

    if (!user) {
      return NextResponse.json({ data: null, error: "ไม่พบผู้ใช้" }, { status: 404 });
    }
    if (!user.msUserId) {
      return NextResponse.json({ data: null, error: "ผู้ใช้นี้ยังไม่เชื่อมกับ Microsoft 365" }, { status: 400 });
    }

    await pushUserToEntra(user.msUserId, {
      displayName: user.name ?? undefined,
      department: user.department?.name ?? null,
      employeeId: user.employeeId ?? null,
    });

    return NextResponse.json({ data: { pushed: true }, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[push-to-m365]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
