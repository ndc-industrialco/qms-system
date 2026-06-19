import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

export async function GET() {
  try {
    await requireAuth();
    const now = new Date();
    const rows = await db.announcement.findMany({
      where: {
        status: "ACTIVE",
        pushToCompanyCenter: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        sourceSystem: true,
        displayType: true,
        startDate: true,
        endDate: true,
        fileName: true,
        spWebUrl: true,
        bgColor: true,
        textColor: true,
        createdAt: true,
        createdBy: { select: { name: true } },
      },
    });
    return sendSuccess(rows, "OK");
  } catch (error) {
    return handleApiError(error);
  }
}
