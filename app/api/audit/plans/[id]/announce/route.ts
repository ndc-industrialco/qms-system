import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { auditAnnounceSchema } from "@/lib/validations/audit";
import { sendAnnouncementOnce } from "@/services/audit/auditNotificationService";
import { db } from "@/lib/db";
import { type NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "QMS" && session.user.role !== "IT" && session.user.role !== "MR") {
      throw new ForbiddenError("Only QMS/MR/IT can publish an audit announcement");
    }

    const { id: planId } = await params;
    const body = await req.json();
    const input = auditAnnounceSchema.parse(body);

    const plan = await db.auditPlan.findUniqueOrThrow({ where: { id: planId } });

    // B-4: only allow announcing when the plan is in a valid pre-announcement status
    if (plan.status !== "PLANNED" && plan.status !== "ANNOUNCED") {
      throw new ValidationError("Plan must be in PLANNED or ANNOUNCED status to announce.");
    }

    // Persist announcement record
    const announcement = await db.auditAnnouncement.create({
      data: {
        planId,
        title: input.title,
        message: input.message,
        deliveryMode: input.deliveryMode,
        publishedAt: new Date(),
        publishedByAuthUserId: session.user.authUserId ?? session.user.id,
      },
    });

    // Advance plan status to ANNOUNCED
    await db.auditPlan.update({
      where: { id: planId },
      data: { status: "ANNOUNCED" },
    });

    // Fire-and-forget email fan-out
    if (input.recipientEmails.length > 0) {
      sendAnnouncementOnce({
        planId,
        auditNo: plan.auditNo,
        planTitle: plan.title,
        message: input.message,
        recipients: input.recipientEmails.map((e) => ({ name: e, email: e })),
        senderAccessToken: session.user.accessToken,
      }).catch(() => {});
    }

    return sendSuccess(announcement, "Announcement published", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
