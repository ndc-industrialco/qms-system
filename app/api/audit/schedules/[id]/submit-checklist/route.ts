import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { uploadFileToAudit } from "@/services/sharepoint";
import { AuditAttachmentRepository } from "@/repositories/audit/auditAttachmentRepository";
import { db } from "@/lib/db";
import { AuditService } from "@/services/auditService";
import { sendChecklistReceivedEmail } from "@/services/audit/auditEmailService";
import { logger } from "@/lib/logger";
import { type NextRequest } from "next/server";

const repo = new AuditAttachmentRepository();
const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXT = new Set(["pdf", "docx", "xlsx", "png", "jpg", "jpeg"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: scheduleId } = await params;

    const schedule = await db.auditSchedule.findUnique({
      where: { id: scheduleId },
      include: { plan: { select: { id: true, title: true, auditNo: true, ownerAuthUserId: true, ownerEmail: true, ownerNameSnapshot: true } } },
    });
    if (!schedule) throw new NotFoundError("Schedule not found");

    const actorId = session.user.authUserId ?? session.user.id;
    const isPrivileged = ["QMS", "IT", "MR"].includes(session.user.role);
    const isLeadAuditor = schedule.leadAuditorAuthUserId === actorId;
    if (!isPrivileged && !isLeadAuditor) {
      throw new ForbiddenError("Only the lead auditor or QMS/IT can submit a checklist");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("file is required");
    if (file.size > MAX_SIZE) throw new ValidationError("File exceeds 20 MB");

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.has(ext)) throw new ValidationError("File type not allowed");

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFileToAudit({
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      planId: schedule.planId,
    });

    const attachment = await repo.create({
      resourceType: "SCHEDULE_CHECKLIST",
      resourceId: scheduleId,
      fileName: file.name,
      fileUrl: result.spWebUrl,
      sharePointItemId: result.spItemId,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      uploadedByAuthUserId: actorId,
      spDownloadUrl: result.spDownloadUrl ?? null,
    } as Parameters<typeof repo.create>[0]);

    const submittedByName = session.user.name ?? actorId;
    const updated = await db.$transaction(async (tx) => {
      const u = await tx.auditSchedule.update({
        where: { id: scheduleId },
        data: {
          checklistSubmittedAt: new Date(),
          checklistSubmittedByUserId: actorId,
          checklistSubmittedByName: submittedByName,
        },
      });
      await AuditService.record(
        {
          actorUserId: session.user.id,
          actorAuthUserId: actorId,
          actorRole: session.user.role,
          action: "UPDATE",
          resourceType: "AUDIT_SCHEDULE",
          resourceId: scheduleId,
          metadata: { action: "CHECKLIST_SUBMITTED", fileName: file.name },
        },
        tx
      );
      return u;
    });

    // Notify plan owner
    if (schedule.plan.ownerEmail && schedule.departmentName) {
      sendChecklistReceivedEmail({
        to: { name: schedule.plan.ownerNameSnapshot ?? schedule.plan.ownerEmail, email: schedule.plan.ownerEmail },
        planTitle: schedule.plan.title,
        auditNo: schedule.plan.auditNo,
        departmentName: schedule.departmentName,
        sessionTitle: schedule.sessionTitle,
        submittedBy: submittedByName,
        planId: schedule.planId,
        senderAccessToken: session.user.accessToken ?? null,
      }).catch((err) => logger.warn("[checklist] notify owner failed", { error: String(err) }));
    }

    return sendSuccess({ schedule: updated, attachment }, "Checklist submitted", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
