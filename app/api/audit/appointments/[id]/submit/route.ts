import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AuditAppointmentService } from "@/services/audit/auditAppointmentService";
import { logger } from "@/lib/logger";
import { type NextRequest } from "next/server";

const svc = new AuditAppointmentService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await req.json().catch(() => ({})) as { ownerSignatureDataUrl?: string };

    logger.info("[appointment/submit] hit", {
      id,
      userId: session.user.id,
      role: session.user.role,
      hasToken: !!session.user.accessToken,
      hasEmail: !!session.user.email,
      hasSig: !!body.ownerSignatureDataUrl,
    });

    const appt = await svc.submit(
      id,
      {
        userId: session.user.id,
        authUserId: session.user.authUserId,
        role: session.user.role,
        nameSnapshot: session.user.name,
        email: session.user.email,
        accessToken: session.user.accessToken,
      },
      body.ownerSignatureDataUrl ?? undefined,
    );

    return sendSuccess(appt, "Appointment submitted for review");
  } catch (err) {
    return handleApiError(err);
  }
}
