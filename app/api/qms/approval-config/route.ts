import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ApprovalConfigService } from "@/services/approvalConfigService";

const updateSchema = z.object({
  mrUserId: z.string().min(1).nullable().optional(),
  qmsUserId: z.string().min(1).nullable().optional(),
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
    const session = await requireRole("QMS", "IT", "MR");
    const parsed = updateSchema.parse(await request.json());
    // Only update keys that were explicitly provided in the request
    const current = await service.getConfig(session.user.accessToken);
    await service.updateConfig(
      parsed.mrUserId !== undefined ? parsed.mrUserId : current.currentMrUserId,
      parsed.qmsUserId !== undefined ? parsed.qmsUserId : current.currentQmsUserId,
    );
    return sendSuccess(null, "Approval config updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
