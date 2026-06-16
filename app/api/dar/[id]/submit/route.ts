import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

const darService = new DarService();

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const dar = await darService.submitDar(id, { userId: session.user.id, authUserId: session.user.authUserId });

    revalidateTag(`dar-${id}`);
    revalidateTag("dar-list");

    return sendSuccess(dar, "DAR submitted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
