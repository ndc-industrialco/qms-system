export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { uploadFileToDar } from "@/services/sharepoint";
import type { ApiResponse } from "@/types/api";
import type { DarAttachmentRow } from "@/types/dar";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<DarAttachmentRow>>> {
  try {
    const session = await requireAuth();
    const { id: darId } = await params;

    // Load DAR to verify access + get metadata for folder path
    const dar = await prisma.darMaster.findUnique({
      where: { id: darId },
      select: {
        id: true,
        darNo: true,
        status: true,
        requesterId: true,
        objective: true,
        docType: true,
        department: { select: { name: true } },
        approvals: { select: { assignedUserId: true } },
      },
    });
    if (!dar) throw new NotFoundError("DAR");

    // Only requester or assigned approvers may attach files; QMS/MR can always
    const isPrivileged = session.user.role === "QMS" || session.user.role === "MR";
    const isAssigned = dar.approvals.some((a) => a.assignedUserId === session.user.id);
    if (!isPrivileged && dar.requesterId !== session.user.id && !isAssigned) {
      throw new ForbiddenError();
    }

    // Only allow uploads while DAR is not yet completed/cancelled
    if (dar.status === "COMPLETED" || dar.status === "CANCELLED") {
      throw new ValidationError("ไม่สามารถเพิ่มไฟล์ในคำขอที่เสร็จสิ้นหรือยกเลิกแล้ว");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ data: null, error: "ไม่พบไฟล์ในคำขอ" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ data: null, error: "ไฟล์ต้องมีขนาดไม่เกิน 20 MB" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ data: null, error: "ประเภทไฟล์ไม่รองรับ" }, { status: 400 });
    }

    const darNo = dar.darNo ?? darId;
    const buffer = Buffer.from(await file.arrayBuffer());

    const sp = await uploadFileToDar({
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
      darNo,
      departmentName: dar.department.name,
      objective: dar.objective as Parameters<typeof uploadFileToDar>[0]["objective"],
      docType: dar.docType as Parameters<typeof uploadFileToDar>[0]["docType"],
    });

    const attachment = await prisma.darAttachment.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        spItemId: sp.spItemId,
        spWebUrl: sp.spWebUrl,
        spDownloadUrl: sp.spDownloadUrl,
        folderPath: sp.folderPath,
        darMasterId: darId,
        uploadedById: session.user.id,
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        spWebUrl: true,
        spDownloadUrl: true,
        folderPath: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    const row: DarAttachmentRow = {
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      spWebUrl: attachment.spWebUrl,
      spDownloadUrl: attachment.spDownloadUrl,
      folderPath: attachment.folderPath,
      createdAt: attachment.createdAt.toISOString(),
      uploadedBy: attachment.uploadedBy,
    };

    return NextResponse.json({ data: row, error: null }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[POST /api/dar/[id]/attachments]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
