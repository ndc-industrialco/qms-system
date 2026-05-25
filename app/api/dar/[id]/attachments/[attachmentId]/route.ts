
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { db } from "@/lib/db";
import { deleteSpItem } from "@/services/sharepoint";
import type { ApiResponse } from "@/types/api";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await requireAuth();
    const { id: darId, attachmentId } = await params;

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
      return NextResponse.json({ data: null, error: "ไม่สามารถลบไฟล์ในคำขอที่เสร็จสิ้นหรือยกเลิกแล้ว" }, { status: 400 });
    }

    try {
      await deleteSpItem(attachment.spItemId);
    } catch (spErr) {
      console.error("[DELETE attachment] SharePoint delete failed (continuing):", spErr);
    }

    await db.darAttachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ data: null, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[DELETE /api/dar/[id]/attachments/[attachmentId]]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
