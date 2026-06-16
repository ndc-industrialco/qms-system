import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/qms/mr/[id]
 *
 * Previously updated local User role. Now that User table is removed (Phase D),
 * role management is Auth Center's responsibility.
 * Use /api/it/users/[id]/role for Auth Center role grants.
 */
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    await requireRole("QMS", "IT", "MR");
    const { id } = await params;

    return NextResponse.json(
      { data: null, error: "Role management is now handled by Auth Center. Use /api/it/users/[id]/role endpoint." },
      { status: 410 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
