import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ApprovalConfigService } from "@/services/approvalConfigService";

const updateSchema = z.object({
  mrUserId: z.string().min(1).nullable(),
  qmsUserId: z.string().min(1).nullable(),
});

const service = new ApprovalConfigService();

export async function GET() {
  try {
    const session = await requireRole("QMS", "IT", "MR");
    const data = await service.getConfig(session.user.accessToken);
    return sendSuccess(data, "Approval config retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole("QMS", "IT", "MR");
    const parsed = updateSchema.parse(await request.json());
    await service.updateConfig(parsed.mrUserId, parsed.qmsUserId);
    return sendSuccess(null, "Approval config updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
