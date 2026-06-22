import { NotificationService } from '@/services/notificationService';
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { sendReviewerAssignedEmail } from "@/services/email";
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

const schema = z.object({
  reviewerUserId: z.string(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await req.json();
    const parsed = schema.parse(body);

    const dar = await darService.assignReviewer(id, { userId: session.user.id, authUserId: session.user.authUserId, accessToken: session.user.accessToken }, parsed.reviewerUserId);

    revalidateTag(`dar-${id}`);
    revalidateTag("dar-list");

    // Resolve reviewer identity from snapshot cache (no User table)
    const reviewerSnapshot = await getUserSnapshot(parsed.reviewerUserId);
    const reviewerName = reviewerSnapshot?.name ?? "";

    if (dar.darNo) {
      await ActionTokenService.revokeByDocument(ApprovalModule.DAR, id);
      const reviewerToken = await ActionTokenService.issue({
        module: ApprovalModule.DAR,
        documentId: id,
        role: ApprovalStep.REVIEWER,
        issuedTo: parsed.reviewerUserId,
      });

      NotificationService.sendEmailOnce(
        `DAR:${id}:REVIEWER_ASSIGNED:reviewer:${parsed.reviewerUserId}:${reviewerToken.substring(0, 16)}`,
        () => sendReviewerAssignedEmail({
          reviewer: { name: reviewerName, email: reviewerSnapshot?.email ?? "" },
          requesterName: dar.requester.name ?? session.user.name ?? "",
          requesterDepartment: dar.requester.department?.name ?? null,
          darNo: dar.darNo!,
          darId: dar.id,
          requestDate: dar.requestDate,
          objective: OBJECTIVE_LABELS[dar.objective],
          docType: dar.docTypeOther
            ? `${DOC_TYPE_LABELS[dar.docType]} — ${dar.docTypeOther}`
            : DOC_TYPE_LABELS[dar.docType],
          reason: dar.reason,
          items: dar.items,
          attachments: dar.attachments.map((a) => ({
            fileName: a.fileName,
            spWebUrl: a.spWebUrl,
          })),
          actionToken: reviewerToken,
          senderAccessToken: session.user.accessToken,
        }),
        reviewerSnapshot?.email ?? "",
        'DAR Reviewer Assigned',
        parsed.reviewerUserId,
        {
          title: "คุณได้รับมอบหมายเป็น Reviewer",
          body: `DAR ${dar.darNo ?? dar.id}`,
          module: "DAR",
          resourceId: id,
          resourceType: "DAR",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    return sendSuccess(dar, "Reviewer assigned successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
