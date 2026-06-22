import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { uploadFileToAudit } from "@/services/sharepoint";
import { AuditAttachmentRepository } from "@/repositories/audit/auditAttachmentRepository";
import { db } from "@/lib/db";
import { type NextRequest } from "next/server";

const repo = new AuditAttachmentRepository();

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);

const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "xlsx", "png", "jpg", "jpeg"]);

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// B-1: Server-side magic byte detection — do not trust client-supplied file.type
function detectMimeFromBuffer(buf: Buffer): string | null {
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    // ZIP-based: DOCX, XLSX — Office Open XML files are ZIP-based; accept based on extension
    return null;
  }
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    // Legacy OLE2 (old .doc, .xls) — reject
    return "__reject__";
  }
  return null; // unknown — reject
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    const formData = await req.formData();
    const file = formData.get("file");
    const planId = formData.get("planId");
    const resourceType = (formData.get("resourceType") as string | null) ?? "PLAN";
    const resourceId = (formData.get("resourceId") as string | null) ?? planId;

    if (!(file instanceof File)) {
      throw new ValidationError("file is required");
    }
    if (!planId || typeof planId !== "string") {
      throw new ValidationError("planId is required");
    }
    if (!resourceId || typeof resourceId !== "string") {
      throw new ValidationError("resourceId is required");
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new ValidationError("File exceeds the 20 MB size limit");
    }

    // B-2: Authorization — must be privileged role OR plan owner OR assigned auditor
    const isPrivileged = ["QMS", "IT", "MR"].includes(session.user.role);
    if (!isPrivileged) {
      const plan = await db.auditPlan.findUnique({
        where: { id: planId },
        select: {
          ownerAuthUserId: true,
          auditors: { select: { assigneeAuthUserId: true } },
        },
      });
      if (!plan) throw new NotFoundError("Plan");
      const actorId = session.user.authUserId ?? session.user.id;
      const isOwner = plan.ownerAuthUserId === actorId;
      const isAuditor = plan.auditors.some((a: { assigneeAuthUserId: string }) => a.assigneeAuthUserId === actorId);
      if (!isOwner && !isAuditor) throw new ForbiddenError();
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // B-1: Magic byte check
    const detectedMime = detectMimeFromBuffer(buffer);
    if (detectedMime === "__reject__") {
      throw new ValidationError("File type not allowed.");
    }
    if (detectedMime !== null && !ALLOWED_MIME_TYPES.has(detectedMime)) {
      throw new ValidationError("File type not allowed.");
    }
    // For ZIP-based (Office Open XML) and unknown cases, fall back to extension check
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new ValidationError("File extension not allowed. Accepted types: PDF, Word, Excel, PNG, JPEG");
    }

    const storedMimeType = detectedMime ?? file.type;

    const result = await uploadFileToAudit({
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: storedMimeType,
      planId,
    });

    // H-1: Store spDownloadUrl alongside spWebUrl so email attachment download uses the pre-auth CDN URL
    const attachment = await repo.create({
      resourceType,
      resourceId,
      fileName: file.name,
      fileUrl: result.spWebUrl,
      sharePointItemId: result.spItemId,
      mimeType: storedMimeType,
      sizeBytes: file.size,
      uploadedByAuthUserId: session.user.authUserId ?? session.user.id,
      spDownloadUrl: result.spDownloadUrl ?? null,
    } as Parameters<typeof repo.create>[0]);

    return sendSuccess(attachment, "File uploaded", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
