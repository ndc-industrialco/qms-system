import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AuditAppointmentService } from "@/services/audit/auditAppointmentService";
import { type NextRequest } from "next/server";

const svc = new AuditAppointmentService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const appt = await svc.approve(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      nameSnapshot: session.user.name,
      email: session.user.email,
      accessToken: session.user.accessToken,
    }, {
      signatureDataUrl: body?.signatureDataUrl ?? null,
      signatureType: body?.signatureType ?? null,
      saveSignature: body?.saveSignature ?? false,
    });

    return sendSuccess(appt, "Appointment approved and published");
  } catch (err) {
    return handleApiError(err);
  }
}
