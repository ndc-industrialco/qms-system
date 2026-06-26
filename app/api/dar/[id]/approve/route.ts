import { NotificationService } from '@/services/notificationService';
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { sendMrApprovalRequestEmail, sendQmsApprovalRequestEmail, sendApprovalNotificationEmail } from "@/services/email";
import { ActionTokenService } from "@/services/actionTokenService";
import { ApprovalModule, ApprovalStep } from "@/generated/prisma/client";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS } from "@/types/dar";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { getUserSnapshot } from "@/lib/userSnapshotCache";

const darService = new DarService();
const configRepo = new SystemConfigRepository();

const schema = z.object({
  signatureDataUrl: z.string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Invalid signature format")
    .max(524288, "Signature image too large"),
  signatureType: z.enum(["DRAW", "TYPE", "IMAGE"]),
  saveSignature: z.boolean().default(false),
  comment: z.string().max(1000).optional().nullable(),
  qmsProcessing: z.object({
    chkHasAttachment: z.boolean(),
    chkPrintAndValidate: z.boolean(),
    chkRenumber: z.boolean(),
    chkImpactInvestigated: z.boolean(),
    chkSubmitVerification: z.boolean(),
    chkGetBackProcess: z.boolean(),
    chkCopyDistribute: z.boolean(),
    comments: z.string().max(2000).optional().nullable(),
  }).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await req.json();
    const parsed = schema.parse(body);

    const dar = await darService.approveDar(id, { userId: session.user.id, authUserId: session.user.authUserId, accessToken: session.user.accessToken }, {
      signatureDataUrl: parsed.signatureDataUrl,
      signatureType: parsed.signatureType,
      saveSignature: parsed.saveSignature,
      comment: parsed.comment ?? null,
      qmsProcessing: parsed.qmsProcessing ?? null,
    });

    revalidateTag(`dar-${id}`);
    revalidateTag("dar-list");

    const reviewerApprovedThisStep = dar.approvals.some(
      (a) => a.stepRole === "REVIEWER" && a.assignedUser.id === session.user.id && a.action === "APPROVED"
    );
    const hasPendingMrStep = dar.approvals.some(
      (a) => a.stepRole === "APPROVER_MR" && a.action === "PENDING"
    );
    const mrApprovedThisStep = dar.approvals.some(
      (a) => a.stepRole === "APPROVER_MR" && a.assignedUser.id === session.user.id && a.action === "APPROVED"
    );
    const hasPendingQmsStep = dar.approvals.some(
      (a) => a.stepRole === "QMS_PROCESSOR" && a.action === "PENDING"
    );
    const qmsApprovedThisStep = dar.approvals.some(
      (a) => a.stepRole === "QMS_PROCESSOR" && a.assignedUser.id === session.user.id && a.action === "APPROVED"
    );

    if (reviewerApprovedThisStep && hasPendingMrStep && dar.darNo) {
      const mrAuthKey = await configRepo.findValueByKey("CURRENT_MR_AUTH_USER_ID")
        ?? await configRepo.findValueByKey("CURRENT_MR_USER_ID");

      if (mrAuthKey) {
        const mrSnapshot = await getUserSnapshot(mrAuthKey);
        const mrToken = await ActionTokenService.issue({
          module: ApprovalModule.DAR,
          documentId: id,
          role: ApprovalStep.APPROVER_MR,
          issuedTo: mrAuthKey,
        });

        NotificationService.sendEmailOnce(
          `DAR:${dar.id}:REVIEWER_APPROVED:mr:${mrAuthKey}:${mrToken.substring(0, 16)}`,
          () => sendMrApprovalRequestEmail({
            mr: { name: mrSnapshot?.name ?? "", email: mrSnapshot?.email ?? "" },
            reviewerName: session.user.name ?? "",
            requesterName: dar.requester.name ?? "",
            requesterDepartment: dar.requester.department?.name ?? null,
            darNo: dar.darNo!,
            darId: dar.id,
            requestDate: dar.requestDate,
            objective: OBJECTIVE_LABELS[dar.objective],
            docType: dar.docTypeOther
              ? `${DOC_TYPE_LABELS[dar.docType]} - ${dar.docTypeOther}`
              : DOC_TYPE_LABELS[dar.docType],
            reason: dar.reason,
            items: dar.items,
            attachments: dar.attachments.map((a) => ({ fileName: a.fileName, spWebUrl: a.spWebUrl })),
            actionToken: mrToken,
            senderAccessToken: session.user.accessToken,
          }),
          mrSnapshot?.email ?? "",
          'DAR MR Approval Request',
          mrAuthKey,
          {
            title: "มี DAR รอการอนุมัติจาก MR",
            body: `DAR ${dar.darNo}`,
            module: "DAR",
            resourceId: id,
            resourceType: "DAR",
          },
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    if (mrApprovedThisStep && hasPendingQmsStep && dar.darNo) {
      const qmsAuthKey = await configRepo.findValueByKey("CURRENT_QMS_AUTH_USER_ID")
        ?? await configRepo.findValueByKey("CURRENT_QMS_USER_ID");

      if (qmsAuthKey) {
        const qmsSnapshot = await getUserSnapshot(qmsAuthKey);
        const qmsToken = await ActionTokenService.issue({
          module: ApprovalModule.DAR,
          documentId: id,
          role: ApprovalStep.QMS_PROCESSOR,
          issuedTo: qmsAuthKey,
        });

        NotificationService.sendEmailOnce(
          `DAR:${dar.id}:MR_APPROVED:qms:${qmsAuthKey}:${qmsToken.substring(0, 16)}`,
          () => sendQmsApprovalRequestEmail({
            qms: { name: qmsSnapshot?.name ?? "", email: qmsSnapshot?.email ?? "" },
            requesterName: dar.requester.name ?? "",
            darNo: dar.darNo!,
            darId: dar.id,
            actionToken: qmsToken,
            senderAccessToken: session.user.accessToken,
          }),
          qmsSnapshot?.email ?? "",
          'DAR QMS Processing Request',
          qmsAuthKey,
          {
            title: "มี DAR รอการประมวลผล QMS",
            body: `DAR ${dar.darNo}`,
            module: "DAR",
            resourceId: id,
            resourceType: "DAR",
          },
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    if (qmsApprovedThisStep && dar.darNo) {
      await ActionTokenService.revokeByDocument(ApprovalModule.DAR, id);

      NotificationService.sendEmailOnce(
        `DAR:${dar.id}:COMPLETED:requester:${dar.requester.id}`,
        () => sendApprovalNotificationEmail({
          to: { name: dar.requester.name ?? "", email: dar.requester.email ?? "" },
          darNo: dar.darNo!,
          darId: dar.id,
          approverName: session.user.name ?? "QMS",
          stepLabel: "QMS",
          nextStepLabel: "Completed",
        }),
        dar.requester.email ?? "",
        'DAR Completed',
        dar.requester.id,
        {
          title: "DAR เสร็จสมบูรณ์",
          body: `DAR ${dar.darNo}`,
          module: "DAR",
          resourceId: id,
          resourceType: "DAR",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    return sendSuccess(dar, "DAR approved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
