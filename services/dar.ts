import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError, ForbiddenError, AppError } from "@/lib/errors";
import type { DarDetail, DarSummary, CreateDarInput, DarApprovalRow, ReviewerCandidate, DarAttachmentRow, TempAttachmentInput } from "@/types/dar";
import type { PrismaClient, DarStatus, SignatureType } from "@/app/generated/prisma";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// ── Approval row ──────────────────────────────────────────────────────────────
const approvalInclude = {
  select: {
    id: true,
    stepRole: true,
    action: true,
    actionDate: true,
    signatureUsedUrl: true,
    signatureTypeUsed: true,
    assignedUser: {
      select: {
        id: true,
        name: true,
        employeeId: true,
        department: { select: { id: true, name: true } },
      },
    },
  },
} as const;

function mapApproval(a: {
  id: string;
  stepRole: DarApprovalRow["stepRole"];
  action: DarApprovalRow["action"];
  actionDate: Date | null;
  signatureUsedUrl: string | null;
  signatureTypeUsed: SignatureType | null;
  assignedUser: { id: string; name: string | null; employeeId: string | null; department: { id: string; name: string } | null };
}): DarApprovalRow {
  return {
    id: a.id,
    stepRole: a.stepRole,
    action: a.action,
    actionDate: a.actionDate?.toISOString() ?? null,
    signatureUsedUrl: a.signatureUsedUrl,
    signatureTypeUsed: a.signatureTypeUsed,
    assignedUser: a.assignedUser,
  };
}

// ── DAR detail mapper ─────────────────────────────────────────────────────────
function mapToDarDetail(raw: {
  id: string;
  darNo: string | null;
  requestDate: Date;
  objective: string;
  docType: string;
  docTypeOther: string | null;
  reason: string;
  status: DarStatus;
  requester: { id: string; name: string | null; employeeId: string | null; department: { id: string; name: string } | null };
  items: { itemNo: number; docNumber: string; docName: string; revision: string }[];
  distributions: { departmentId: string; department: { id: string; name: string } }[];
  approvals: {
    id: string;
    stepRole: DarApprovalRow["stepRole"];
    action: DarApprovalRow["action"];
    actionDate: Date | null;
    signatureUsedUrl: string | null;
    signatureTypeUsed: SignatureType | null;
    assignedUser: { id: string; name: string | null; employeeId: string | null; department: { id: string; name: string } | null };
  }[];
  attachments: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    spWebUrl: string;
    spDownloadUrl: string;
    folderPath: string;
    createdAt: Date;
    uploadedBy: { id: string; name: string | null };
  }[];
}): DarDetail {
  return {
    id: raw.id,
    darNo: raw.darNo,
    requestDate: raw.requestDate.toISOString(),
    objective: raw.objective as DarDetail["objective"],
    docType: raw.docType as DarDetail["docType"],
    docTypeOther: raw.docTypeOther,
    reason: raw.reason,
    status: raw.status,
    requester: raw.requester,
    items: raw.items.map((i) => ({ itemNo: i.itemNo, docNumber: i.docNumber, docName: i.docName, revision: i.revision })),
    distributions: raw.distributions,
    approvals: raw.approvals.map(mapApproval),
    attachments: raw.attachments.map((a): DarAttachmentRow => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      spWebUrl: a.spWebUrl,
      spDownloadUrl: a.spDownloadUrl,
      folderPath: a.folderPath,
      createdAt: a.createdAt.toISOString(),
      uploadedBy: a.uploadedBy,
    })),
  };
}

const darDetailInclude = {
  requester: {
    select: { id: true, name: true, employeeId: true, department: { select: { id: true, name: true } } },
  },
  items: {
    select: { itemNo: true, docNumber: true, docName: true, revision: true },
    orderBy: { itemNo: "asc" as const },
  },
  distributions: {
    select: { departmentId: true, department: { select: { id: true, name: true } } },
  },
  approvals: {
    ...approvalInclude,
    orderBy: { id: "asc" as const },
  },
  attachments: {
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
    orderBy: { createdAt: "asc" as const },
  },
} as const;

// ── List / fetch ──────────────────────────────────────────────────────────────
export async function getAllDars(): Promise<DarSummary[]> {
  const raws = await prisma.darMaster.findMany({
    select: { id: true, darNo: true, requestDate: true, objective: true, docType: true, status: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return raws.map((r) => ({
    id: r.id, darNo: r.darNo, requestDate: r.requestDate.toISOString(),
    objective: r.objective as DarSummary["objective"], docType: r.docType as DarSummary["docType"],
    status: r.status, itemCount: r._count.items,
  }));
}

export async function getDarsByRequesterId(requesterId: string, page: number, limit: number): Promise<{ dars: DarSummary[]; total: number }> {
  const [raws, total] = await Promise.all([
    prisma.darMaster.findMany({
      where: { requesterId },
      select: { id: true, darNo: true, requestDate: true, objective: true, docType: true, status: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.darMaster.count({ where: { requesterId } }),
  ]);
  const dars: DarSummary[] = raws.map((r) => ({
    id: r.id, darNo: r.darNo, requestDate: r.requestDate.toISOString(),
    objective: r.objective as DarSummary["objective"], docType: r.docType as DarSummary["docType"],
    status: r.status, itemCount: r._count.items,
  }));
  return { dars, total };
}

export async function getDarById(id: string, requesterId: string, isPrivileged = false): Promise<DarDetail> {
  const raw = await prisma.darMaster.findUnique({ where: { id }, include: darDetailInclude });
  if (!raw) throw new NotFoundError("DAR");
  // privileged roles OR the requester OR any assigned approver can view
  const isAssignedApprover = raw.approvals.some((a) => a.assignedUser.id === requesterId);
  if (!isPrivileged && raw.requesterId !== requesterId && !isAssignedApprover) throw new ForbiddenError();
  return mapToDarDetail(raw);
}

// ── Create / update draft ─────────────────────────────────────────────────────
export async function createDar(requesterId: string, departmentId: string, input: CreateDarInput): Promise<DarDetail> {
  // Look up department name for folder path (needed to adopt temp attachments)
  const dept = await prisma.department.findUnique({ where: { id: departmentId }, select: { name: true } });

  const raw = await prisma.darMaster.create({
    data: {
      objective: input.objective, docType: input.docType, docTypeOther: input.docTypeOther ?? null,
      reason: input.reason, status: "DRAFT", requesterId, departmentId,
      items: { create: input.items.map((item, idx) => ({ itemNo: idx + 1, docNumber: item.docNumber, docName: item.docName, revision: item.revision })) },
      distributions: { create: input.distributionDepartmentIds.map((deptId) => ({ departmentId: deptId })) },
    },
    include: darDetailInclude,
  });

  // Move temp attachments into the proper DAR folder and create DB records
  if (input.tempAttachments && input.tempAttachments.length > 0 && dept) {
    await adoptTempAttachments({
      darId: raw.id,
      darNo: raw.darNo ?? raw.id,
      uploadedById: requesterId,
      departmentName: dept.name,
      objective: input.objective,
      docType: input.docType,
      tempAttachments: input.tempAttachments,
    });
    // Re-fetch with attachments included
    const withAttachments = await prisma.darMaster.findUnique({ where: { id: raw.id }, include: darDetailInclude });
    return mapToDarDetail(withAttachments!);
  }

  return mapToDarDetail(raw);
}

async function adoptTempAttachments(opts: {
  darId: string;
  darNo: string;
  uploadedById: string;
  departmentName: string;
  objective: CreateDarInput["objective"];
  docType: CreateDarInput["docType"];
  tempAttachments: TempAttachmentInput[];
}): Promise<void> {
  const { moveSpItem, buildFolderPath } = await import("@/services/sharepoint");
  const targetPath = buildFolderPath({ departmentName: opts.departmentName, objective: opts.objective, docType: opts.docType });

  const results = await Promise.allSettled(
    opts.tempAttachments.map(async (t) => {
      const safeBase = t.fileName.replace(/[/\\:*?"<>|]/g, "_");
      const newName = `${opts.darNo}_${safeBase}`;
      const moved = await moveSpItem({ spItemId: t.spItemId, targetFolderPath: targetPath, newName });
      return { t, moved, targetPath };
    }),
  );

  const toCreate = results
    .filter((r): r is PromiseFulfilledResult<{ t: TempAttachmentInput; moved: { spWebUrl: string; spDownloadUrl: string }; targetPath: string }> => r.status === "fulfilled")
    .map(({ value: { t, moved, targetPath } }) => ({
      fileName: t.fileName,
      fileSize: t.fileSize,
      mimeType: t.mimeType,
      spItemId: t.spItemId,
      spWebUrl: moved.spWebUrl,
      spDownloadUrl: moved.spDownloadUrl,
      folderPath: targetPath,
      darMasterId: opts.darId,
      uploadedById: opts.uploadedById,
    }));

  if (toCreate.length > 0) {
    await prisma.darAttachment.createMany({ data: toCreate });
  }

  // Log any failed moves
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[adoptTempAttachments] Failed to move temp file #${i}:`, r.reason);
    }
  });
}

export async function updateDarDraft(id: string, requesterId: string, input: Partial<CreateDarInput>): Promise<DarDetail> {
  const existing = await prisma.darMaster.findUnique({ where: { id }, select: { status: true, requesterId: true } });
  if (!existing) throw new NotFoundError("DAR");
  if (existing.requesterId !== requesterId) throw new ForbiddenError();
  if (existing.status !== "DRAFT") throw new ValidationError("Only DRAFT requests can be edited");

  const raw = await prisma.$transaction(async (tx) => {
    if (input.items !== undefined) await tx.darItem.deleteMany({ where: { darMasterId: id } });
    if (input.distributionDepartmentIds !== undefined) await tx.darDistribution.deleteMany({ where: { darMasterId: id } });
    return tx.darMaster.update({
      where: { id },
      data: {
        ...(input.objective !== undefined && { objective: input.objective }),
        ...(input.docType !== undefined && { docType: input.docType }),
        ...(input.docTypeOther !== undefined && { docTypeOther: input.docTypeOther }),
        ...(input.reason !== undefined && { reason: input.reason }),
        ...(input.items !== undefined && { items: { create: input.items.map((item, idx) => ({ itemNo: idx + 1, docNumber: item.docNumber, docName: item.docName, revision: item.revision })) } }),
        ...(input.distributionDepartmentIds !== undefined && { distributions: { create: input.distributionDepartmentIds.map((deptId) => ({ departmentId: deptId })) } }),
      },
      include: darDetailInclude,
    });
  });
  return mapToDarDetail(raw);
}

// ── DAR number generation ─────────────────────────────────────────────────────
async function generateDarNo(year: number, tx: Tx): Promise<string> {
  const counterKey = `DAR_COUNTER_${year}`;
  const config = await tx.systemConfig.upsert({
    where: { configKey: counterKey },
    update: { configValue: { increment: 1 } as unknown as string },
    create: { configKey: counterKey, configValue: "1", description: `DAR counter for ${year}` },
    select: { configValue: true },
  });
  const seq = parseInt(config.configValue, 10);
  return `DAR-${year}-${String(seq).padStart(4, "0")}`;
}

// ── Submit (DRAFT → PENDING_REVIEW + create PREPARER approval record) ─────────
export async function submitDar(id: string, requesterId: string): Promise<DarDetail> {
  const existing = await prisma.darMaster.findUnique({ where: { id }, select: { status: true, requesterId: true } });
  if (!existing) throw new NotFoundError("DAR");
  if (existing.requesterId !== requesterId) throw new ForbiddenError();
  if (existing.status !== "DRAFT") throw new ValidationError("Only DRAFT requests can be submitted");

  const year = new Date().getFullYear();
  const raw = await prisma.$transaction(async (tx) => {
    const darNo = await generateDarNo(year, tx);
    // Advance status + create PREPARER step (auto-approved by the requester)
    return tx.darMaster.update({
      where: { id },
      data: {
        status: "PENDING_REVIEW",
        darNo,
        approvals: {
          create: {
            stepRole: "PREPARER",
            action: "PENDING",
            assignedUserId: requesterId,
          },
        },
      },
      include: darDetailInclude,
    });
  });
  return mapToDarDetail(raw);
}

// ── Assign reviewer (PENDING_REVIEW → pick a reviewer) ───────────────────────
export async function assignReviewer(darId: string, requesterId: string, reviewerUserId: string): Promise<DarDetail> {
  const dar = await prisma.darMaster.findUnique({
    where: { id: darId },
    select: { status: true, requesterId: true, approvals: { select: { stepRole: true, action: true } } },
  });
  if (!dar) throw new NotFoundError("DAR");
  if (dar.requesterId !== requesterId) throw new ForbiddenError();
  if (dar.status !== "PENDING_REVIEW") throw new ValidationError("DAR ต้องอยู่ในสถานะ PENDING_REVIEW");

  // Preparer must have approved first
  const preparer = dar.approvals.find((a) => a.stepRole === "PREPARER");
  if (!preparer || preparer.action !== "APPROVED") {
    throw new ValidationError("ผู้จัดทำต้องยืนยันก่อนกำหนดผู้ตรวจสอบ");
  }

  // Check reviewer exists and has msUserId
  const reviewer = await prisma.user.findUnique({ where: { id: reviewerUserId }, select: { id: true, msUserId: true, email: true, name: true } });
  if (!reviewer) throw new NotFoundError("ผู้ตรวจสอบ");

  const raw = await prisma.$transaction(async (tx) => {
    // Remove any existing REVIEWER step if re-assigning
    await tx.darApproval.deleteMany({ where: { darMasterId: darId, stepRole: "REVIEWER" } });
    return tx.darMaster.update({
      where: { id: darId },
      data: {
        approvals: { create: { stepRole: "REVIEWER", action: "PENDING", assignedUserId: reviewerUserId } },
      },
      include: darDetailInclude,
    });
  });
  return mapToDarDetail(raw);
}

// ── Approve step (sign and advance) ──────────────────────────────────────────
export interface ApproveInput {
  signatureDataUrl: string;      // base64 image (PNG)
  signatureType: SignatureType;
  saveSignature: boolean;        // persist to user profile
}

export async function approveDar(
  darId: string,
  userId: string,
  input: ApproveInput,
): Promise<DarDetail> {
  const dar = await prisma.darMaster.findUnique({
    where: { id: darId },
    select: {
      id: true,
      status: true,
      requesterId: true,
      approvals: {
        select: { id: true, stepRole: true, action: true, assignedUserId: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!dar) throw new NotFoundError("DAR");

  // Find the pending step this user is assigned to
  const myStep = dar.approvals.find(
    (a) => a.assignedUserId === userId && a.action === "PENDING",
  );
  if (!myStep) throw new ForbiddenError("ไม่พบขั้นตอนที่รอการอนุมัติของคุณ");

  // Validate state machine transitions
  if (myStep.stepRole === "PREPARER" && dar.status !== "PENDING_REVIEW") {
    throw new ValidationError("สถานะ DAR ไม่ถูกต้อง");
  }
  if (myStep.stepRole === "REVIEWER" && dar.status !== "PENDING_REVIEW") {
    throw new ValidationError("สถานะ DAR ไม่ถูกต้อง");
  }
  if (myStep.stepRole === "APPROVER_MR" && dar.status !== "PENDING_APPROVE") {
    throw new ValidationError("สถานะ DAR ไม่ถูกต้อง");
  }

  // Determine next status
  let nextStatus: DarStatus = dar.status;
  let createMrStep = false;

  if (myStep.stepRole === "PREPARER") {
    // Preparer approved — stay PENDING_REVIEW, waiting for reviewer assignment
    nextStatus = "PENDING_REVIEW";
  } else if (myStep.stepRole === "REVIEWER") {
    // Reviewer approved → PENDING_APPROVE, auto-assign MR
    nextStatus = "PENDING_APPROVE";
    createMrStep = true;
  } else if (myStep.stepRole === "APPROVER_MR") {
    // MR approved → QMS_PROCESSING
    nextStatus = "QMS_PROCESSING";
  }

  // Get MR user id from SystemConfig if needed
  let mrUserId: string | null = null;
  if (createMrStep) {
    const cfg = await prisma.systemConfig.findUnique({ where: { configKey: "CURRENT_MR_USER_ID" } });
    if (!cfg?.configValue) throw new AppError("ยังไม่ได้ตั้งค่า MR ในระบบ กรุณาติดต่อ QMS", 400);
    mrUserId = cfg.configValue;
  }

  const now = new Date();
  const raw = await prisma.$transaction(async (tx) => {
    // Update the approval record with signature
    await tx.darApproval.update({
      where: { id: myStep.id },
      data: {
        action: "APPROVED",
        actionDate: now,
        signatureUsedUrl: input.signatureDataUrl,
        signatureTypeUsed: input.signatureType,
      },
    });

    // Optionally save signature to user profile
    if (input.saveSignature) {
      await tx.user.update({
        where: { id: userId },
        data: { savedSignatureUrl: input.signatureDataUrl, signatureType: input.signatureType },
      });
    }

    // Create MR approval step if reviewer just approved
    const newApprovals = createMrStep && mrUserId
      ? { create: { stepRole: "APPROVER_MR" as const, action: "PENDING" as const, assignedUserId: mrUserId } }
      : undefined;

    return tx.darMaster.update({
      where: { id: darId },
      data: { status: nextStatus, ...(newApprovals && { approvals: newApprovals }) },
      include: darDetailInclude,
    });
  });

  return mapToDarDetail(raw);
}

// ── Reject step ───────────────────────────────────────────────────────────────
export async function rejectDar(darId: string, userId: string, reason: string): Promise<DarDetail> {
  const dar = await prisma.darMaster.findUnique({
    where: { id: darId },
    select: { id: true, status: true, approvals: { select: { id: true, stepRole: true, action: true, assignedUserId: true } } },
  });
  if (!dar) throw new NotFoundError("DAR");

  const myStep = dar.approvals.find((a) => a.assignedUserId === userId && a.action === "PENDING");
  if (!myStep) throw new ForbiddenError("ไม่พบขั้นตอนที่รอการอนุมัติของคุณ");

  const now = new Date();
  const raw = await prisma.$transaction(async (tx) => {
    await tx.darApproval.update({
      where: { id: myStep.id },
      data: { action: "REJECTED", actionDate: now },
    });
    // Revert to PENDING_REVIEW so preparer can re-submit or cancel
    return tx.darMaster.update({
      where: { id: darId },
      data: { status: "DRAFT" },
      include: darDetailInclude,
    });
  });
  return mapToDarDetail(raw);
}

// ── Reviewer candidates (M365-linked users only) ──────────────────────────────
export async function getReviewerCandidates(): Promise<ReviewerCandidate[]> {
  const users = await prisma.user.findMany({
    where: { msUserId: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      msUserId: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
  return users as ReviewerCandidate[];
}

// ── Delete DRAFT ─────────────────────────────────────────────────────────────
export async function deleteDar(id: string, requesterId: string): Promise<void> {
  const dar = await prisma.darMaster.findUnique({
    where: { id },
    select: {
      status: true,
      requesterId: true,
      attachments: { select: { spItemId: true } },
    },
  });
  if (!dar) throw new NotFoundError("DAR");
  if (dar.requesterId !== requesterId) throw new ForbiddenError();
  if (dar.status !== "DRAFT") throw new ValidationError("ลบได้เฉพาะคำขอที่เป็นฉบับร่างเท่านั้น");

  // Delete SharePoint files in parallel (non-fatal if they fail)
  if (dar.attachments.length > 0) {
    const { deleteSpItem } = await import("@/services/sharepoint");
    await Promise.allSettled(dar.attachments.map((a) => deleteSpItem(a.spItemId)));
  }

  // Cascade deletes handle DarItem, DarDistribution, DarAttachment, DarApproval
  await prisma.darMaster.delete({ where: { id } });
}

// ── Saved signature getter ────────────────────────────────────────────────────
export async function getSavedSignature(userId: string): Promise<{ url: string; type: SignatureType } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { savedSignatureUrl: true, signatureType: true },
  });
  if (!user?.savedSignatureUrl || !user.signatureType) return null;
  return { url: user.savedSignatureUrl, type: user.signatureType };
}
