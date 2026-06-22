import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AuditAppointmentService } from "@/services/audit/auditAppointmentService";
import { NotFoundError } from "@/lib/errors";
import { type NextRequest } from "next/server";

const svc = new AuditAppointmentService();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const appt = await svc.findById(id);
    if (!appt) throw new NotFoundError("Appointment not found");
    return sendSuccess(appt, "Audit appointment retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}
