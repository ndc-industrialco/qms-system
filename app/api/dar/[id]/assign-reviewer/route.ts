export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assignReviewer } from "@/services/dar";
import type { ApiResponse } from "@/types/api";
import type { DarDetail } from "@/types/dar";

const schema = z.object({
  reviewerUserId: z.string().cuid(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<DarDetail>>> {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? "Invalid request body";
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const dar = await assignReviewer(id, session.user.id, parsed.data.reviewerUserId);

    revalidateTag(`dar-${id}`);
    revalidateTag("dar-list");

    return NextResponse.json({ data: dar, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[POST /api/dar/[id]/assign-reviewer]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
