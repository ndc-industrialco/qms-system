export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { AppError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { deleteSpItem } from "@/services/sharepoint";
import type { ApiResponse } from "@/types/api";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const session = await requireAuth();
    const { id: darId, attachmentId } = await params;

    const attachment = await prisma.darAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        spItemId: true,
        uploadedById: true,
        darMaster: { select: { id: true, requesterId: true, status: true } },
      },
    });

    if (!attachment || attachment.darMaster.id !== darId) throw new NotFoundError("ไฟล์แนบ");

    // Only uploader, requester, QMS, or MR may delete
    const isPrivileged = session.user.role === "QMS" || session.user.role === "MR";
    const isOwner = attachment.uploadedById === session.user.id || attachment.darMaster.requesterId === session.user.id;
    if (!isPrivileged && !isOwner) throw new ForbiddenError();

    if (attachment.darMaster.status === "COMPLETED" || attachment.darMaster.status === "CANCELLED") {
      return NextResponse.json({ data: null, error: "ไม่สามารถลบไฟล์ในคำขอที่เสร็จสิ้นหรือยกเลิกแล้ว" }, { status: 400 });
    }

    // Delete from SharePoint then DB (SP failure is non-fatal — log and continue)
    try {
      await deleteSpItem(attachment.spItemId);
    } catch (spErr) {
      console.error("[DELETE attachment] SharePoint delete failed (continuing):", spErr);
    }

    await prisma.darAttachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ data: null, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[DELETE /api/dar/[id]/attachments/[attachmentId]]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
