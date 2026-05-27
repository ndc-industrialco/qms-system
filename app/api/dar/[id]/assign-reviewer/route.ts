
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assignReviewer } from "@/services/dar";
import { sendReviewerAssignedEmail } from "@/services/email";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS } from "@/types/dar";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types/api";
import type { DarDetail } from "@/types/dar";

const schema = z.object({
  reviewerUserId: z.string().uuid(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<DarDetail>>> {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const error = parsed.error.issues[0]?.message ?? "Invalid request body";
      return NextResponse.json({ data: null, error }, { status: 400 });
    }

    const dar = await assignReviewer(id, session.user.id, parsed.data.reviewerUserId);

    revalidateTag(`dar-${id}`);
    revalidateTag("dar-list");

    // Send email notification to reviewer (fire-and-forget — don't fail the request)
    const reviewerUser = await db.user.findUnique({
      where: { id: parsed.data.reviewerUserId },
      select: { name: true, email: true },
    });

    if (reviewerUser?.email && dar.darNo) {
      sendReviewerAssignedEmail({
        reviewer: { name: reviewerUser.name ?? "", email: reviewerUser.email },
        requesterName: dar.requester.name ?? session.user.name ?? "",
        requesterDepartment: dar.requester.department?.name ?? null,
        darNo: dar.darNo,
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
        senderEmail: session.user.email ?? undefined,
      }).catch((e) => console.error("[email] Failed to send reviewer notification:", e));
    }

    return NextResponse.json({ data: dar, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[POST /api/dar/[id]/assign-reviewer]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
