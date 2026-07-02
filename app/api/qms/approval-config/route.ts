import { requireRoleEdge } from "@/lib/auth";
import { ApprovalConfigService } from "@/services/approvalConfigService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { z } from "zod";

const configService = new ApprovalConfigService();

const approvalConfigSchema = z.object({
  mrAuthUserId: z.string().nullable().optional(),
  qmsAuthUserId: z.string().nullable().optional(),
  emails: z.object({
    mrEmail: z.string().nullable().optional(),
    qmsEmail: z.string().nullable().optional(),
  }).optional(),
  darQmsAuthUserId: z.string().nullable().optional(),
  carQmsAuthUserId: z.string().nullable().optional(),
  darMrAuthUserId: z.string().nullable().optional(),
  carMrAuthUserId: z.string().nullable().optional(),
  moduleEmails: z.object({
    darQmsEmail: z.string().nullable().optional(),
    carQmsEmail: z.string().nullable().optional(),
    darMrEmail: z.string().nullable().optional(),
    carMrEmail: z.string().nullable().optional(),
  }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireRoleEdge(req, "QMS", "IT");
    const result = await configService.getConfig(session.user.accessToken);
    return sendSuccess(result, "Approval configurations retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRoleEdge(req, "QMS", "IT");
    const body = await req.json();
    const validated = approvalConfigSchema.parse(body);

    await configService.updateConfig(
      validated.mrAuthUserId ?? null,
      validated.qmsAuthUserId ?? null,
      validated.emails,
      validated.darQmsAuthUserId ?? null,
      validated.carQmsAuthUserId ?? null,
      validated.moduleEmails,
      validated.darMrAuthUserId ?? null,
      validated.carMrAuthUserId ?? null,
    );

    return sendSuccess(null, "Approval configurations updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
