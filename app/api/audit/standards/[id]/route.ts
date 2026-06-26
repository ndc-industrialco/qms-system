import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError } from "@/lib/errors";
import { AuditStandardRepository } from "@/repositories/audit/auditStandardRepository";
import { type NextRequest } from "next/server";

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);
const repo = new AuditStandardRepository();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();
    const { id } = await params;
    const { name } = await req.json();
    const updated = await repo.updateName(id, name);
    return sendSuccess(updated, "Updated");
  } catch (err) { return handleApiError(err); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();
    const { id } = await params;
    await repo.deleteOne(id);
    return sendSuccess(null, "Deleted");
  } catch (err) { return handleApiError(err); }
}
