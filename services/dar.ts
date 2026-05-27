import { db } from "@/lib/db";
import { NotFoundError, ValidationError, ForbiddenError, AppError } from "@/lib/errors";
import type { DarDetail, DarSummary, CreateDarInput, DarApprovalRow, ReviewerCandidate, DarAttachmentRow, TempAttachmentInput } from "@/types/dar";
import type { DarStatus, SignatureType } from "@/generated/prisma/client";

// ── Mappers ───────────────────────────────────────────────────────────────────

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

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchDarDetail(id: string): Promise<DarDetail | null> {
  const master = await db.darMaster.findUnique({
    where: { id },
    include: {
      requester: { include: { department: true } },
      items: { orderBy: { itemNo: "asc" } },
      distributions: { include: { department: true } },
      approvals: {
        orderBy: { id: "asc" },
        include: { assignedUser: { include: { department: true } } },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
        include: { uploadedBy: true },
      },
    },
  });

  if (!master) return null;

  return {
    id: master.id,
    darNo: master.darNo,
    requestDate: master.requestDate.toISOString(),
    objective: master.objective as DarDetail["objective"],
    docType: master.docType as DarDetail["docType"],
    docTypeOther: master.docTypeOther,
    reason: master.reason,
    status: master.status,
    requester: {
      id: master.requester.id,
      name: master.requester.name,
      employeeId: master.requester.employeeId,
      department: master.requester.department ?? null,
    },
    items: master.items.map((i) => ({
      itemNo: i.itemNo,
      docNumber: i.docNumber,
      docName: i.docName,
      revision: i.revision,
    })),
    distributions: master.distributions.map((d) => ({
      departmentId: d.departmentId,
      department: { id: d.department.id, name: d.department.name },
    })),
    approvals: master.approvals.map((a) =>
      mapApproval({
        id: a.id,
        stepRole: a.stepRole,
        action: a.action,
        actionDate: a.actionDate,
        signatureUsedUrl: a.signatureUsedUrl,
        signatureTypeUsed: a.signatureTypeUsed,
        assignedUser: {
          id: a.assignedUser.id,
          name: a.assignedUser.name,
          employeeId: a.assignedUser.employeeId,
          department: a.assignedUser.department ?? null,
        },
      })
    ),
    attachments: master.attachments.map((a): DarAttachmentRow => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      spItemId: a.spItemId,
      spWebUrl: a.spWebUrl,
      spDownloadUrl: a.spDownloadUrl,
      folderPath: a.folderPath,
      createdAt: a.createdAt.toISOString(),
      uploadedBy: { id: a.uploadedBy.id, name: a.uploadedBy.name },
    })),
  };
}

// ── List / fetch ──────────────────────────────────────────────────────────────

export async function getAllDars(): Promise<DarSummary[]> {
  const masters = await db.darMaster.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { items: true } } },
  });

  return masters.map((r) => ({
    id: r.id,
    darNo: r.darNo,
    requestDate: r.requestDate.toISOString(),
    objective: r.objective as DarSummary["objective"],
    docType: r.docType as DarSummary["docType"],
    status: r.status,
    itemCount: r._count.items,
  }));
}

export async function getDarsByRequesterId(
  requesterId: string,
  page: number,
  limit: number,
): Promise<{ dars: DarSummary[]; total: number }> {
  const [masters, total] = await Promise.all([
    db.darMaster.findMany({
      where: { requesterId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { items: true } } },
    }),
    db.darMaster.count({ where: { requesterId } }),
  ]);

  return {
    dars: masters.map((r) => ({
      id: r.id,
      darNo: r.darNo,
      requestDate: r.requestDate.toISOString(),
      objective: r.objective as DarSummary["objective"],
      docType: r.docType as DarSummary["docType"],
      status: r.status,
      itemCount: r._count.items,
    })),
    total,
  };
}

export async function getDarById(id: string, requesterId: string, isPrivileged = false): Promise<DarDetail> {
  const detail = await fetchDarDetail(id);
  if (!detail) throw new NotFoundError("DAR");

  const isAssignedApprover = detail.approvals.some((a) => a.assignedUser.id === requesterId);
  if (!isPrivileged && detail.requester.id !== requesterId && !isAssignedApprover) throw new ForbiddenError();

  return detail;
}

// ── Create / update draft ─────────────────────────────────────────────────────

export async function createDar(requesterId: string, departmentId: string, input: CreateDarInput): Promise<DarDetail> {
  const dept = await db.department.findUnique({ where: { id: departmentId }, select: { name: true } });

  const newDar = await db.darMaster.create({
    data: {
      objective: input.objective,
      docType: input.docType,
      docTypeOther: input.docTypeOther ?? null,
      reason: input.reason,
      status: "DRAFT",
      requesterId,
      departmentId,
      items: {
        create: input.items.map((item, idx) => ({
          itemNo: idx + 1,
          docNumber: item.docNumber,
          docName: item.docName,
          revision: item.revision,
        })),
      },
      distributions: {
        create: input.distributionDepartmentIds.map((deptId) => ({ departmentId: deptId })),
      },
    },
    select: { id: true, darNo: true },
  });

  if (input.tempAttachments && input.tempAttachments.length > 0 && dept) {
    await adoptTempAttachments({
      darId: newDar.id,
      darNo: newDar.darNo ?? newDar.id,
      uploadedById: requesterId,
      departmentName: dept.name,
      objective: input.objective,
      docType: input.docType,
      tempAttachments: input.tempAttachments,
    });
  }

  const detail = await fetchDarDetail(newDar.id);
  return detail!;
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
    .filter(
      (r): r is PromiseFulfilledResult<{ t: TempAttachmentInput; moved: { spWebUrl: string; spDownloadUrl: string }; targetPath: string }> =>
        r.status === "fulfilled",
    )
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
    await db.darAttachment.createMany({ data: toCreate });
  }

  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[adoptTempAttachments] Failed to move temp file #${i}:`, r.reason);
  });
}

export async function updateDarDraft(
  id: string,
  requesterId: string,
  input: Partial<CreateDarInput>,
  isPrivileged = false,
): Promise<DarDetail> {
  const existing = await db.darMaster.findUnique({ where: { id }, select: { status: true, requesterId: true } });

  if (!existing) throw new NotFoundError("DAR");
  if (!isPrivileged && existing.requesterId !== requesterId) throw new ForbiddenError();
  if (!isPrivileged && existing.status !== "DRAFT") throw new ValidationError("Only DRAFT requests can be edited");

  await db.$transaction(async (tx) => {
    const updateData: Record<string, unknown> = {};
    if (input.objective !== undefined) updateData.objective = input.objective;
    if (input.docType !== undefined) updateData.docType = input.docType;
    if (input.docTypeOther !== undefined) updateData.docTypeOther = input.docTypeOther;
    if (input.reason !== undefined) updateData.reason = input.reason;

    if (Object.keys(updateData).length > 0) {
      await tx.darMaster.update({ where: { id }, data: updateData });
    }

    if (input.items !== undefined) {
      await tx.darItem.deleteMany({ where: { darMasterId: id } });
      if (input.items.length > 0) {
        await tx.darItem.createMany({
          data: input.items.map((item, idx) => ({
            itemNo: idx + 1,
            docNumber: item.docNumber,
            docName: item.docName,
            revision: item.revision,
            darMasterId: id,
          })),
        });
      }
    }

    if (input.distributionDepartmentIds !== undefined) {
      await tx.darDistribution.deleteMany({ where: { darMasterId: id } });
      if (input.distributionDepartmentIds.length > 0) {
        await tx.darDistribution.createMany({
          data: input.distributionDepartmentIds.map((deptId) => ({ darMasterId: id, departmentId: deptId })),
        });
      }
    }
  });

  const detail = await fetchDarDetail(id);
  return detail!;
}

// ── DAR number generation ─────────────────────────────────────────────────────

async function generateDarNo(year: number, tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]): Promise<string> {
  const counterKey = `DAR_COUNTER_${year}`;

  const existing = await tx.systemConfig.findUnique({ where: { configKey: counterKey }, select: { configValue: true } });
  const nextSeq = existing ? parseInt(existing.configValue, 10) + 1 : 1;

  await tx.systemConfig.upsert({
    where: { configKey: counterKey },
    update: { configValue: String(nextSeq) },
    create: { configKey: counterKey, configValue: String(nextSeq), description: `DAR counter for ${year}` },
  });

  return `DAR-${year}-${String(nextSeq).padStart(4, "0")}`;
}

// ── Submit ────────────────────────────────────────────────────────────────────

export async function submitDar(id: string, requesterId: string): Promise<DarDetail> {
  const existing = await db.darMaster.findUnique({ where: { id }, select: { status: true, requesterId: true } });

  if (!existing) throw new NotFoundError("DAR");
  if (existing.requesterId !== requesterId) throw new ForbiddenError();
  if (existing.status !== "DRAFT") throw new ValidationError("Only DRAFT requests can be submitted");

  const year = new Date().getFullYear();

  await db.$transaction(async (tx) => {
    const darNo = await generateDarNo(year, tx);
    await tx.darMaster.update({ where: { id }, data: { status: "PENDING_REVIEW", darNo } });
    await tx.darApproval.create({
      data: { stepRole: "PREPARER", action: "PENDING", assignedUserId: requesterId, darMasterId: id },
    });
  });

  const detail = await fetchDarDetail(id);
  return detail!;
}

// ── Assign reviewer ───────────────────────────────────────────────────────────

export async function assignReviewer(darId: string, requesterId: string, reviewerUserId: string): Promise<DarDetail> {
  const dar = await db.darMaster.findUnique({ where: { id: darId }, select: { status: true, requesterId: true } });

  if (!dar) throw new NotFoundError("DAR");
  if (dar.requesterId !== requesterId) throw new ForbiddenError();
  if (dar.status !== "PENDING_REVIEW") throw new ValidationError("DAR ต้องอยู่ในสถานะ PENDING_REVIEW");

  const currentApprovals = await db.darApproval.findMany({ where: { darMasterId: darId }, select: { stepRole: true, action: true } });

  const preparer = currentApprovals.find((a) => a.stepRole === "PREPARER");
  if (!preparer || preparer.action !== "APPROVED") throw new ValidationError("ผู้จัดทำต้องยืนยันก่อนกำหนดผู้ตรวจสอบ");

  const reviewer = await db.user.findUnique({ where: { id: reviewerUserId }, select: { id: true } });
  if (!reviewer) throw new NotFoundError("ผู้ตรวจสอบ");

  await db.$transaction(async (tx) => {
    await tx.darApproval.deleteMany({ where: { darMasterId: darId, stepRole: "REVIEWER" } });
    await tx.darApproval.create({
      data: { stepRole: "REVIEWER", action: "PENDING", assignedUserId: reviewerUserId, darMasterId: darId },
    });
  });

  const detail = await fetchDarDetail(darId);
  return detail!;
}

// ── Approve ───────────────────────────────────────────────────────────────────

export interface ApproveInput {
  signatureDataUrl: string;
  signatureType: SignatureType;
  saveSignature: boolean;
}

export async function approveDar(darId: string, userId: string, input: ApproveInput): Promise<DarDetail> {
  const dar = await db.darMaster.findUnique({ where: { id: darId }, select: { id: true, status: true, requesterId: true } });
  if (!dar) throw new NotFoundError("DAR");

  const currentApprovals = await db.darApproval.findMany({
    where: { darMasterId: darId },
    orderBy: { id: "asc" },
    select: { id: true, stepRole: true, action: true, assignedUserId: true },
  });

  const myStep = currentApprovals.find((a) => a.assignedUserId === userId && a.action === "PENDING");
  if (!myStep) throw new ForbiddenError("ไม่พบขั้นตอนที่รอการอนุมัติของคุณ");

  if (myStep.stepRole === "PREPARER" && dar.status !== "PENDING_REVIEW") throw new ValidationError("สถานะ DAR ไม่ถูกต้อง");
  if (myStep.stepRole === "REVIEWER" && dar.status !== "PENDING_REVIEW") throw new ValidationError("สถานะ DAR ไม่ถูกต้อง");
  if (myStep.stepRole === "APPROVER_MR" && dar.status !== "PENDING_APPROVE") throw new ValidationError("สถานะ DAR ไม่ถูกต้อง");

  let nextStatus: DarStatus = dar.status;
  let createMrStep = false;

  if (myStep.stepRole === "PREPARER") {
    nextStatus = "PENDING_REVIEW";
  } else if (myStep.stepRole === "REVIEWER") {
    nextStatus = "PENDING_APPROVE";
    createMrStep = true;
  } else if (myStep.stepRole === "APPROVER_MR") {
    nextStatus = "QMS_PROCESSING";
  }

  let mrUserId: string | null = null;
  if (createMrStep) {
    const cfg = await db.systemConfig.findUnique({ where: { configKey: "CURRENT_MR_USER_ID" }, select: { configValue: true } });
    if (!cfg?.configValue) throw new AppError("ยังไม่ได้ตั้งค่า MR ในระบบ กรุณาติดต่อ QMS", 400);
    mrUserId = cfg.configValue;
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.darApproval.update({
      where: { id: myStep.id },
      data: { action: "APPROVED", actionDate: now, signatureUsedUrl: input.signatureDataUrl, signatureTypeUsed: input.signatureType },
    });

    if (input.saveSignature) {
      await tx.user.update({
        where: { id: userId },
        data: { savedSignatureUrl: input.signatureDataUrl, signatureType: input.signatureType },
      });
    }

    if (createMrStep && mrUserId) {
      await tx.darApproval.create({
        data: { stepRole: "APPROVER_MR", action: "PENDING", assignedUserId: mrUserId, darMasterId: darId },
      });
    }

    await tx.darMaster.update({ where: { id: darId }, data: { status: nextStatus } });
  });

  const detail = await fetchDarDetail(darId);
  return detail!;
}

// ── Reject ────────────────────────────────────────────────────────────────────

export async function rejectDar(darId: string, userId: string, _reason: string): Promise<DarDetail> {
  const dar = await db.darMaster.findUnique({ where: { id: darId }, select: { id: true, status: true } });
  if (!dar) throw new NotFoundError("DAR");

  const myStep = await db.darApproval.findFirst({
    where: { darMasterId: darId, assignedUserId: userId, action: "PENDING" },
    select: { id: true },
  });
  if (!myStep) throw new ForbiddenError("ไม่พบขั้นตอนที่รอการอนุมัติของคุณ");

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.darApproval.update({ where: { id: myStep.id }, data: { action: "REJECTED", actionDate: now } });
    await tx.darMaster.update({ where: { id: darId }, data: { status: "DRAFT" } });
  });

  const detail = await fetchDarDetail(darId);
  return detail!;
}

// ── Reviewer candidates ───────────────────────────────────────────────────────

export async function getReviewerCandidates(): Promise<ReviewerCandidate[]> {
  const users = await db.user.findMany({
    where: { msUserId: { not: null } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      msUserId: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    employeeId: u.employeeId,
    msUserId: u.msUserId,
    department: u.department ?? null,
  }));
}

// ── Delete DRAFT ──────────────────────────────────────────────────────────────

export async function deleteDar(id: string, requesterId: string, isPrivileged = false): Promise<void> {
  const dar = await db.darMaster.findUnique({ where: { id }, select: { status: true, requesterId: true } });

  if (!dar) throw new NotFoundError("DAR");
  if (!isPrivileged && dar.requesterId !== requesterId) throw new ForbiddenError();
  if (!isPrivileged && dar.status !== "DRAFT") throw new ValidationError("ลบได้เฉพาะคำขอที่เป็นฉบับร่างเท่านั้น");

  // Delete SharePoint files first (outside transaction — network calls)
  const attachments = await db.darAttachment.findMany({ where: { darMasterId: id }, select: { spItemId: true } });
  if (attachments.length > 0) {
    const { deleteSpItem } = await import("@/services/sharepoint");
    await Promise.allSettled(attachments.map((a) => deleteSpItem(a.spItemId)));
  }

  // Delete all related DB records then the master in one transaction
  await db.$transaction([
    db.darApproval.deleteMany({ where: { darMasterId: id } }),
    db.darAttachment.deleteMany({ where: { darMasterId: id } }),
    db.darItem.deleteMany({ where: { darMasterId: id } }),
    db.darDistribution.deleteMany({ where: { darMasterId: id } }),
    db.darMaster.delete({ where: { id } }),
  ]);
}

// ── Saved signature ───────────────────────────────────────────────────────────

export async function getSavedSignature(userId: string): Promise<{ url: string; type: SignatureType } | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { savedSignatureUrl: true, signatureType: true },
  });

  if (!user?.savedSignatureUrl || !user.signatureType) return null;
  return { url: user.savedSignatureUrl, type: user.signatureType };
}

