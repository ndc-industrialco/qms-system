
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/apiErrorHandler";
import { db } from "@/lib/db";
import { deleteSpItem } from "@/services/sharepoint";
import { z } from "zod";

const paramSchema = z.object({
  id: z.string().uuid(),
  attachmentId: z.string().uuid(),
});

type Params = { params: Promise<{ id: string; attachmentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: darId, attachmentId } = paramSchema.parse(await params);

    const attachment = await db.darAttachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, spItemId: true, uploadedById: true, darMasterId: true },
    });

    if (!attachment || attachment.darMasterId !== darId) throw new NotFoundError("ไฟล์แนบ");

    const dar = await db.darMaster.findUnique({
      where: { id: darId },
      select: { requesterId: true, status: true },
    });

    if (!dar) throw new NotFoundError("DAR");

    const isPrivileged = session.user.role === "QMS" || session.user.role === "MR";
    const isOwner = attachment.uploadedById === session.user.id || dar.requesterId === session.user.id;
    if (!isPrivileged && !isOwner) throw new ForbiddenError();

    if (dar.status === "COMPLETED" || dar.status === "CANCELLED") {
      throw new ValidationError("ไม่สามารถลบไฟล์ในคำขอที่เสร็จสิ้นหรือยกเลิกแล้ว");
    }

    try {
      await deleteSpItem(attachment.spItemId);
    } catch (spErr) {
      console.error("[DELETE attachment] SharePoint delete failed (continuing):", spErr);
    }

    await db.darAttachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ data: null, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
