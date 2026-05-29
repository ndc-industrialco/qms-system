
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/apiErrorHandler";
import { db } from "@/lib/db";
import { uploadFileToDar, deleteSpItem } from "@/services/sharepoint";
import type { DarAttachmentRow } from "@/types/dar";
import { z } from "zod";

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

const paramSchema = z.object({ id: z.string().uuid() });

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const rawParams = await params;
    const { id: darId } = paramSchema.parse(rawParams);

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
      throw new ValidationError("ไม่พบไฟล์ในคำขอ");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError("ไฟล์ต้องมีขนาดไม่เกิน 20 MB");
    }
    if (!ALLOWED_MIME.has(file.type)) {
      throw new ValidationError("ประเภทไฟล์ไม่รองรับ");
    }

    const darNo = dar.darNo ?? darId;
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!hasValidMagicBytes(buffer, file.type)) {
      throw new ValidationError("เนื้อหาไฟล์ไม่ตรงกับประเภทที่ระบุ");
    }

    // Step 1: Upload to SharePoint
    const sp = await uploadFileToDar({
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
      darNo,
      departmentName: dar.department?.name ?? "",
      objective: dar.objective as Parameters<typeof uploadFileToDar>[0]["objective"],
      docType: dar.docType as Parameters<typeof uploadFileToDar>[0]["docType"],
    });

    // Step 2: Persist DB row. On failure, delete the SP file to avoid orphaned files.
    let attachment;
    try {
      attachment = await db.darAttachment.create({
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
    } catch (dbErr) {
      // Compensation: delete the uploaded SP file to prevent orphan
      console.error("[POST /api/dar/[id]/attachments] DB insert failed after SP upload. Compensating by deleting SP item.", dbErr);
      try {
        await deleteSpItem(sp.spItemId);
      } catch (delErr) {
        console.error("[POST /api/dar/[id]/attachments] Compensation SP delete also failed for item:", sp.spItemId, delErr);
      }
      throw dbErr;
    }

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
    return handleApiError(err);
  }
}
