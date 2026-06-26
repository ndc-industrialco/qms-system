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
    const newMrId  = parsed.mrUserId  !== undefined ? parsed.mrUserId  : current.currentMrUserId;
    const newQmsId = parsed.qmsUserId !== undefined ? parsed.qmsUserId : current.currentQmsUserId;
    const mrEmail  = newMrId  ? (current.users.find((u) => u.authUserId === newMrId)?.email  ?? null) : null;
    const qmsEmail = newQmsId ? (current.users.find((u) => u.authUserId === newQmsId)?.email ?? null) : null;
    await service.updateConfig(newMrId, newQmsId, { mrEmail, qmsEmail });
    return sendSuccess(null, "Approval config updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
