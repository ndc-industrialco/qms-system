import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditAppointmentRepository } from "@/repositories/audit/auditAppointmentRepository";
import { AuditSessionPlanRepository } from "@/repositories/audit/auditSessionPlanRepository";
import { type NextRequest } from "next/server";

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);
const apptRepo = new AuditAppointmentRepository();
const sessionRepo = new AuditSessionPlanRepository();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const appt = await apptRepo.findById(id);
    if (!appt) throw new NotFoundError("Appointment not found");

    const plan = await sessionRepo.findByAppointmentId(id);
    return sendSuccess(plan ?? null);
  } catch (err) {
    return handleApiError(err);
  }
}

type TeamMemberInput = {
  role: string;
  name: string;
  authUserId?: string | null;
};

type SessionInput = {
  orderIndex: number;
  auditDate: string;
  startTime: string;
  endTime: string;
  department: string;
  remark?: string | null;
  teamMembers: TeamMemberInput[];
};

type GanttRowInput = {
  orderIndex: number;
  department: string;
  processes: string[];
  planWeeks: string[];
  actualWeeks: string[];
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();

    const { id } = await params;
    const appt = await apptRepo.findById(id);
    if (!appt) throw new NotFoundError("Appointment not found");

    const body = await req.json() as {
      reviseNo?: number;
      reviseDate?: string | null;
      sessions: SessionInput[];
      ganttRows: GanttRowInput[];
    };

    const plan = await sessionRepo.saveByAppointment(id, body);
    return sendSuccess(plan, "Session plan saved");
  } catch (err) {
    return handleApiError(err);
  }
}
