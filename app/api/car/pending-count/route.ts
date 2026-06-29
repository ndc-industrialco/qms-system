import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireAuth();
    const deptId = session.user.authDepartmentId ?? null;
    if (!deptId) return sendSuccess({ count: 0 });

    const count = await db.carMaster.count({
      where: { targetAuthDepartmentId: deptId, status: "ISSUED" },
    });

    return sendSuccess({ count });
  } catch (err) {
    return handleApiError(err);
  }
}
