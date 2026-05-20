export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getDarById, updateDarDraft, deleteDar } from "@/services/dar";
import type { ApiResponse } from "@/types/api";
import type { DarDetail } from "@/types/dar";

const updateSchema = z.object({
  objective: z.enum(["PREPARE_NEW", "REQUEST_COPY_CONTROLLED", "REQUEST_COPY_UNCONTROLLED", "REVISE", "CANCEL"]).optional(),
  docType: z.enum(["MANUAL", "FORMAT", "DRAWING", "PROCEDURE", "SOP", "SIP", "IPQC", "OTHER"]).optional(),
  docTypeOther: z.string().max(100).optional(),
  reason: z.string().min(1).max(2000).optional(),
  items: z.array(z.object({
    docNumber: z.string().min(1).max(100),
    docName: z.string().min(1).max(255),
    revision: z.string().min(1).max(50),
  })).min(1).optional(),
  distributionDepartmentIds: z.array(z.string().cuid()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<DarDetail>>> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const isPrivileged = session.user.role === "QMS" || session.user.role === "MR";
    const dar = await getDarById(id, session.user.id, isPrivileged);
    return NextResponse.json({ data: dar, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await requireAuth();
    const { id } = await params;
    await deleteDar(id, session.user.id);
    revalidateTag("dar-list");
    return NextResponse.json({ data: null, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[DELETE /api/dar/[id]]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<DarDetail>>> {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? "Invalid request body";
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const dar = await updateDarDraft(id, session.user.id, parsed.data);

    revalidateTag(`dar-${id}`);
    revalidateTag("dar-list");

    return NextResponse.json({ data: dar, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
