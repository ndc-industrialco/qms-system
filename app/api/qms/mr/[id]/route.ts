import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { ValidationError } from "@/lib/errors";
import { grantAuthCenterRole } from "@/lib/auth-center-admin-client";
import { AuditService } from "@/services/auditService";
import { toRenamedQmsRole, normalizeQmsRole } from "@/lib/qms-roles";

const bodySchema = z.object({
  role: z.enum(["MR", "USER"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("QMS", "IT", "MR");
    const { id: authUserId } = await params;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid body");

    const normalizedRole = normalizeQmsRole(parsed.data.role);
    const renamedRole = toRenamedQmsRole(normalizedRole);

    await grantAuthCenterRole(authUserId, renamedRole, { accessToken: session.user.accessToken });

    await AuditService.record({
      actorUserId: session.user.id,
      actorAuthUserId: session.user.authUserId,
      actorRole: session.user.role,
      action: "ROLE_CHANGE",
      resourceType: "USER",
      resourceId: authUserId,
      after: { role: normalizedRole, source: "qms_mr_management" },
    });

    return sendSuccess({ authUserId, role: normalizedRole }, "Role updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
