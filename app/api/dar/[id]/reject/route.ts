import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";

const darService = new DarService();

const schema = z.object({
  reason: z.string().min(1, "กรุณาระบุเหตุผล").max(1000),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await req.json();
    const parsed = schema.parse(body);

    const dar = await darService.rejectDar(id, { userId: session.user.id, authUserId: session.user.authUserId, accessToken: session.user.accessToken }, parsed.reason);

    revalidateTag(`dar-${id}`);
    revalidateTag("dar-list");

    return sendSuccess(dar, "DAR rejected successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
