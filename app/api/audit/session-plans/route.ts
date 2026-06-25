import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { db } from "@/lib/db";
import { type NextRequest } from "next/server";

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);

// POST /api/audit/session-plans  { appointmentId }
// Creates a new AuditSessionPlan for a PUBLISHED appointment (or returns existing)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();

    const body = await req.json() as { appointmentId: string };
    if (!body.appointmentId) throw new ValidationError("appointmentId required");

    const appt = await db.auditAppointment.findUnique({ where: { id: body.appointmentId } });
    if (!appt) throw new NotFoundError("Appointment not found");
    if (appt.status !== "PUBLISHED") throw new ValidationError("Appointment must be PUBLISHED to create a session plan");

    // Upsert — return existing if already created
    const plan = await db.auditSessionPlan.upsert({
      where: { appointmentId: body.appointmentId },
      update: {},
      create: { appointmentId: body.appointmentId, reviseNo: 0 },
    });

    return sendSuccess({ id: plan.id }, "Session plan ready");
  } catch (err) {
    return handleApiError(err);
  }
}
