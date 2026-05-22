export const runtime = 'nodejs';

import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { AppError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { db } from "@/lib/db";
import { uploadFileToDar } from "@/services/sharepoint";
import type { ApiResponse } from "@/types/api";
import type { DarAttachmentRow } from "@/types/dar";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png", "image/jpeg", "image/gif", "image/webp",
]);

function hasValidMagicBytes(buffer: Uint8Array, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  const b = buffer;
  switch (mimeType) {
    case "application/pdf":
      return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
    case "image/png":
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
    case "image/jpeg":
      return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
    case "image/gif":
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
    case "image/webp":
      return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
             b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return b[0] === 0x50 && b[1] === 0x4B;
    case "application/msword":
    case "application/vnd.ms-excel":
      return b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0;
    default:
      return false;
  }
}

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse<ApiResponse<DarAttachmentRow>>> {
  try {
    const session = await requireAuth();
    const { id: darId } = await params;

    const dar = await db.darMaster.findUnique({
      where: { id: darId },
      select: {
        id: true, darNo: true, status: true, requesterId: true,
        objective: true, docType: true,
        department: { select: { name: true } },
        approvals: { select: { assignedUserId: true } },
      },
    });

    if (!dar) throw new NotFoundError("DAR");

    const isPrivileged = session.user.role === "QMS" || session.user.role === "MR";
    const isAssigned = dar.approvals.some((a) => a.assignedUserId === session.user.id);
    if (!isPrivileged && dar.requesterId !== session.user.id && !isAssigned) throw new ForbiddenError();

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
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!hasValidMagicBytes(buffer, file.type)) {
      return NextResponse.json({ data: null, error: "เนื้อหาไฟล์ไม่ตรงกับประเภทที่ระบุ" }, { status: 400 });
    }

    const sp = await uploadFileToDar({
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
      darNo,
      departmentName: dar.department?.name ?? "",
      objective: dar.objective as Parameters<typeof uploadFileToDar>[0]["objective"],
      docType: dar.docType as Parameters<typeof uploadFileToDar>[0]["docType"],
    });

    const attachment = await db.darAttachment.create({
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
    });

    const row: DarAttachmentRow = {
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      spItemId: attachment.spItemId,
      spWebUrl: attachment.spWebUrl,
      spDownloadUrl: attachment.spDownloadUrl,
      folderPath: attachment.folderPath,
      createdAt: attachment.createdAt.toISOString(),
      uploadedBy: { id: session.user.id, name: session.user.name ?? null },
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
