export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { submitDar } from "@/services/dar";
import type { ApiResponse } from "@/types/api";
import type { DarDetail } from "@/types/dar";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<DarDetail>>> {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const dar = await submitDar(id, session.user.id);

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
