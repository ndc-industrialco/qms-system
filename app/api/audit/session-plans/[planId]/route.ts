import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditSessionPlanRepository } from "@/repositories/audit/auditSessionPlanRepository";
import { type NextRequest } from "next/server";

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);
const repo = new AuditSessionPlanRepository();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    await requireAuth();
    const { planId } = await params;
    const plan = await repo.findDetailById(planId);
    if (!plan) throw new NotFoundError("Session plan not found");
    return sendSuccess(plan);
  } catch (err) {
    return handleApiError(err);
  }
}

type TeamMemberInput = { role: string; name: string; authUserId?: string | null };
type SessionInput = {
  orderIndex: number; auditDate: string; startTime: string; endTime: string;
  department: string; remark?: string | null; teamMembers: TeamMemberInput[];
};
type GanttRowInput = {
  orderIndex: number; department: string; processes: string[];
  planWeeks: string[]; actualWeeks: string[];
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();

    const { planId } = await params;
    const existing = await repo.findById(planId);
    if (!existing) throw new NotFoundError("Session plan not found");

    const body = await req.json() as {
      reviseNo?: number; reviseDate?: string | null;
      sessions: SessionInput[]; ganttRows: GanttRowInput[];
    };

    const plan = await repo.saveById(planId, body, existing);
    return sendSuccess(plan, "Session plan saved");
  } catch (err) {
    return handleApiError(err);
  }
}
