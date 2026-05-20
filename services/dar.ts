import { eq, and, desc, asc, sql, count, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  darMasters, darItems, darDistributions, darApprovals, darAttachments,
  users, departments, systemConfig,
  type DarStatus, type SignatureType,
} from "@/db/schema";
import { NotFoundError, ValidationError, ForbiddenError, AppError } from "@/lib/errors";
import type { DarDetail, DarSummary, CreateDarInput, DarApprovalRow, ReviewerCandidate, DarAttachmentRow, TempAttachmentInput } from "@/types/dar";

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
  const [master] = await db
    .select({
      id: darMasters.id,
      darNo: darMasters.darNo,
      requestDate: darMasters.requestDate,
      objective: darMasters.objective,
      docType: darMasters.docType,
      docTypeOther: darMasters.docTypeOther,
      reason: darMasters.reason,
      status: darMasters.status,
      requesterId: darMasters.requesterId,
    })
    .from(darMasters)
    .where(eq(darMasters.id, id))
    .limit(1);

  if (!master) return null;

  const [requesterRow] = await db
    .select({
      id: users.id,
      name: users.name,
      employeeId: users.employeeId,
      departmentId: users.departmentId,
    })
    .from(users)
    .where(eq(users.id, master.requesterId))
    .limit(1);

  const requesterDept = requesterRow.departmentId
    ? await db.select({ id: departments.id, name: departments.name }).from(departments).where(eq(departments.id, requesterRow.departmentId)).limit(1)
    : [];

  const [items, distributions, approvalsRaw, attachmentsRaw] = await Promise.all([
    db.select({ itemNo: darItems.itemNo, docNumber: darItems.docNumber, docName: darItems.docName, revision: darItems.revision })
      .from(darItems).where(eq(darItems.darMasterId, id)).orderBy(asc(darItems.itemNo)),

    db.select({ departmentId: darDistributions.departmentId, deptName: departments.name, deptId: departments.id })
      .from(darDistributions)
      .innerJoin(departments, eq(darDistributions.departmentId, departments.id))
      .where(eq(darDistributions.darMasterId, id)),

    db.select({
      id: darApprovals.id,
      stepRole: darApprovals.stepRole,
      action: darApprovals.action,
      actionDate: darApprovals.actionDate,
      signatureUsedUrl: darApprovals.signatureUsedUrl,
      signatureTypeUsed: darApprovals.signatureTypeUsed,
      assignedUserId: darApprovals.assignedUserId,
    }).from(darApprovals).where(eq(darApprovals.darMasterId, id)).orderBy(asc(darApprovals.id)),

    db.select({
      id: darAttachments.id,
      fileName: darAttachments.fileName,
      fileSize: darAttachments.fileSize,
      mimeType: darAttachments.mimeType,
      spItemId: darAttachments.spItemId,
      spWebUrl: darAttachments.spWebUrl,
      spDownloadUrl: darAttachments.spDownloadUrl,
      folderPath: darAttachments.folderPath,
      createdAt: darAttachments.createdAt,
      uploadedById: darAttachments.uploadedById,
    }).from(darAttachments).where(eq(darAttachments.darMasterId, id)).orderBy(asc(darAttachments.createdAt)),
  ]);

  // Fetch assignedUser for each approval
  const approverIds = [...new Set(approvalsRaw.map((a) => a.assignedUserId))];
  const approverUsers = approverIds.length > 0
    ? await db.select({ id: users.id, name: users.name, employeeId: users.employeeId, departmentId: users.departmentId })
        .from(users).where(inArray(users.id, approverIds))
    : [];

  const approverDeptIds = [...new Set(approverUsers.map((u) => u.departmentId).filter(Boolean))] as string[];
  const approverDepts = approverDeptIds.length > 0
    ? await db.select({ id: departments.id, name: departments.name }).from(departments).where(inArray(departments.id, approverDeptIds))
    : [];

  const approverDeptMap = Object.fromEntries(approverDepts.map((d) => [d.id, d]));
  const approverUserMap = Object.fromEntries(
    approverUsers.map((u) => [u.id, { ...u, department: u.departmentId ? (approverDeptMap[u.departmentId] ?? null) : null }]),
  );

  // Fetch uploadedBy for each attachment
  const uploaderIds = [...new Set(attachmentsRaw.map((a) => a.uploadedById))];
  const uploaders = uploaderIds.length > 0
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, uploaderIds))
    : [];
  const uploaderMap = Object.fromEntries(uploaders.map((u) => [u.id, u]));

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
      id: requesterRow.id,
      name: requesterRow.name,
      employeeId: requesterRow.employeeId,
      department: requesterDept[0] ?? null,
    },
    items: items.map((i) => ({ itemNo: i.itemNo, docNumber: i.docNumber, docName: i.docName, revision: i.revision })),
    distributions: distributions.map((d) => ({ departmentId: d.departmentId, department: { id: d.deptId, name: d.deptName } })),
    approvals: approvalsRaw.map((a) => mapApproval({ ...a, assignedUser: approverUserMap[a.assignedUserId] ?? { id: a.assignedUserId, name: null, employeeId: null, department: null } })),
    attachments: attachmentsRaw.map((a): DarAttachmentRow => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      spItemId: a.spItemId,
      spWebUrl: a.spWebUrl,
      spDownloadUrl: a.spDownloadUrl,
      folderPath: a.folderPath,
      createdAt: a.createdAt.toISOString(),
      uploadedBy: uploaderMap[a.uploadedById] ?? { id: a.uploadedById, name: null },
    })),
  };
}

// ── List / fetch ──────────────────────────────────────────────────────────────

export async function getAllDars(): Promise<DarSummary[]> {
  const itemCounts = db
    .select({ darMasterId: darItems.darMasterId, cnt: count().as("cnt") })
    .from(darItems)
    .groupBy(darItems.darMasterId)
    .as("itemCounts");

  const raws = await db
    .select({
      id: darMasters.id,
      darNo: darMasters.darNo,
      requestDate: darMasters.requestDate,
      objective: darMasters.objective,
      docType: darMasters.docType,
      status: darMasters.status,
      itemCount: sql<number>`coalesce(${itemCounts.cnt}, 0)`,
    })
    .from(darMasters)
    .leftJoin(itemCounts, eq(darMasters.id, itemCounts.darMasterId))
    .orderBy(desc(darMasters.createdAt))
    .limit(200);

  return raws.map((r) => ({
    id: r.id,
    darNo: r.darNo,
    requestDate: r.requestDate.toISOString(),
    objective: r.objective as DarSummary["objective"],
    docType: r.docType as DarSummary["docType"],
    status: r.status,
    itemCount: Number(r.itemCount),
  }));
}

export async function getDarsByRequesterId(requesterId: string, page: number, limit: number): Promise<{ dars: DarSummary[]; total: number }> {
  const itemCounts = db
    .select({ darMasterId: darItems.darMasterId, cnt: count().as("cnt") })
    .from(darItems)
    .groupBy(darItems.darMasterId)
    .as("itemCounts");

  const [raws, [{ total }]] = await Promise.all([
    db.select({
      id: darMasters.id,
      darNo: darMasters.darNo,
      requestDate: darMasters.requestDate,
      objective: darMasters.objective,
      docType: darMasters.docType,
      status: darMasters.status,
      itemCount: sql<number>`coalesce(${itemCounts.cnt}, 0)`,
    })
      .from(darMasters)
      .leftJoin(itemCounts, eq(darMasters.id, itemCounts.darMasterId))
      .where(eq(darMasters.requesterId, requesterId))
      .orderBy(desc(darMasters.createdAt))
      .offset((page - 1) * limit)
      .limit(limit),

    db.select({ total: count() }).from(darMasters).where(eq(darMasters.requesterId, requesterId)),
  ]);

  return {
    dars: raws.map((r) => ({
      id: r.id, darNo: r.darNo, requestDate: r.requestDate.toISOString(),
      objective: r.objective as DarSummary["objective"], docType: r.docType as DarSummary["docType"],
      status: r.status, itemCount: Number(r.itemCount),
    })),
    total: Number(total),
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
  const deptRows = await db.select({ name: departments.name }).from(departments).where(eq(departments.id, departmentId)).limit(1);

  const [newDar] = await db.insert(darMasters).values({
    objective: input.objective, docType: input.docType, docTypeOther: input.docTypeOther ?? null,
    reason: input.reason, status: "DRAFT", requesterId, departmentId,
  }).returning({ id: darMasters.id, darNo: darMasters.darNo });

  await Promise.all([
    input.items.length > 0
      ? db.insert(darItems).values(input.items.map((item, idx) => ({ itemNo: idx + 1, docNumber: item.docNumber, docName: item.docName, revision: item.revision, darMasterId: newDar.id })))
      : Promise.resolve(),
    input.distributionDepartmentIds.length > 0
      ? db.insert(darDistributions).values(input.distributionDepartmentIds.map((deptId) => ({ darMasterId: newDar.id, departmentId: deptId })))
      : Promise.resolve(),
  ]);

  if (input.tempAttachments && input.tempAttachments.length > 0 && deptRows[0]) {
    await adoptTempAttachments({
      darId: newDar.id,
      darNo: newDar.darNo ?? newDar.id,
      uploadedById: requesterId,
      departmentName: deptRows[0].name,
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
    .filter((r): r is PromiseFulfilledResult<{ t: TempAttachmentInput; moved: { spWebUrl: string; spDownloadUrl: string }; targetPath: string }> => r.status === "fulfilled")
    .map(({ value: { t, moved, targetPath } }) => ({
      fileName: t.fileName, fileSize: t.fileSize, mimeType: t.mimeType,
      spItemId: t.spItemId, spWebUrl: moved.spWebUrl, spDownloadUrl: moved.spDownloadUrl,
      folderPath: targetPath, darMasterId: opts.darId, uploadedById: opts.uploadedById,
    }));

  if (toCreate.length > 0) {
    await db.insert(darAttachments).values(toCreate);
  }

  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[adoptTempAttachments] Failed to move temp file #${i}:`, r.reason);
  });
}

export async function updateDarDraft(id: string, requesterId: string, input: Partial<CreateDarInput>): Promise<DarDetail> {
  const [existing] = await db.select({ status: darMasters.status, requesterId: darMasters.requesterId })
    .from(darMasters).where(eq(darMasters.id, id)).limit(1);

  if (!existing) throw new NotFoundError("DAR");
  if (existing.requesterId !== requesterId) throw new ForbiddenError();
  if (existing.status !== "DRAFT") throw new ValidationError("Only DRAFT requests can be edited");

  await db.transaction(async (tx) => {
    if (input.items !== undefined) {
      await tx.delete(darItems).where(eq(darItems.darMasterId, id));
    }
    if (input.distributionDepartmentIds !== undefined) {
      await tx.delete(darDistributions).where(eq(darDistributions.darMasterId, id));
    }

    const updateData: Partial<typeof darMasters.$inferInsert> = {};
    if (input.objective !== undefined) updateData.objective = input.objective;
    if (input.docType !== undefined) updateData.docType = input.docType;
    if (input.docTypeOther !== undefined) updateData.docTypeOther = input.docTypeOther;
    if (input.reason !== undefined) updateData.reason = input.reason;

    if (Object.keys(updateData).length > 0) {
      await tx.update(darMasters).set(updateData).where(eq(darMasters.id, id));
    }

    if (input.items && input.items.length > 0) {
      await tx.insert(darItems).values(input.items.map((item, idx) => ({ itemNo: idx + 1, docNumber: item.docNumber, docName: item.docName, revision: item.revision, darMasterId: id })));
    }
    if (input.distributionDepartmentIds && input.distributionDepartmentIds.length > 0) {
      await tx.insert(darDistributions).values(input.distributionDepartmentIds.map((deptId) => ({ darMasterId: id, departmentId: deptId })));
    }
  });

  const detail = await fetchDarDetail(id);
  return detail!;
}

// ── DAR number generation ─────────────────────────────────────────────────────

async function generateDarNo(year: number, tx: Parameters<Parameters<typeof db.transaction>[0]>[0]): Promise<string> {
  const counterKey = `DAR_COUNTER_${year}`;
  const [existing] = await tx.select({ configValue: systemConfig.configValue })
    .from(systemConfig).where(eq(systemConfig.configKey, counterKey)).limit(1);

  const nextSeq = existing ? parseInt(existing.configValue, 10) + 1 : 1;

  await tx.insert(systemConfig)
    .values({ configKey: counterKey, configValue: String(nextSeq), description: `DAR counter for ${year}` })
    .onConflictDoUpdate({ target: systemConfig.configKey, set: { configValue: String(nextSeq) } });

  return `DAR-${year}-${String(nextSeq).padStart(4, "0")}`;
}

// ── Submit ────────────────────────────────────────────────────────────────────

export async function submitDar(id: string, requesterId: string): Promise<DarDetail> {
  const [existing] = await db.select({ status: darMasters.status, requesterId: darMasters.requesterId })
    .from(darMasters).where(eq(darMasters.id, id)).limit(1);

  if (!existing) throw new NotFoundError("DAR");
  if (existing.requesterId !== requesterId) throw new ForbiddenError();
  if (existing.status !== "DRAFT") throw new ValidationError("Only DRAFT requests can be submitted");

  const year = new Date().getFullYear();
  await db.transaction(async (tx) => {
    const darNo = await generateDarNo(year, tx);
    await tx.update(darMasters).set({ status: "PENDING_REVIEW", darNo }).where(eq(darMasters.id, id));
    await tx.insert(darApprovals).values({ stepRole: "PREPARER", action: "PENDING", assignedUserId: requesterId, darMasterId: id });
  });

  const detail = await fetchDarDetail(id);
  return detail!;
}

// ── Assign reviewer ───────────────────────────────────────────────────────────

export async function assignReviewer(darId: string, requesterId: string, reviewerUserId: string): Promise<DarDetail> {
  const [dar] = await db.select({ status: darMasters.status, requesterId: darMasters.requesterId })
    .from(darMasters).where(eq(darMasters.id, darId)).limit(1);

  if (!dar) throw new NotFoundError("DAR");
  if (dar.requesterId !== requesterId) throw new ForbiddenError();
  if (dar.status !== "PENDING_REVIEW") throw new ValidationError("DAR ต้องอยู่ในสถานะ PENDING_REVIEW");

  const currentApprovals = await db.select({ stepRole: darApprovals.stepRole, action: darApprovals.action })
    .from(darApprovals).where(eq(darApprovals.darMasterId, darId));

  const preparer = currentApprovals.find((a) => a.stepRole === "PREPARER");
  if (!preparer || preparer.action !== "APPROVED") throw new ValidationError("ผู้จัดทำต้องยืนยันก่อนกำหนดผู้ตรวจสอบ");

  const [reviewer] = await db.select({ id: users.id }).from(users).where(eq(users.id, reviewerUserId)).limit(1);
  if (!reviewer) throw new NotFoundError("ผู้ตรวจสอบ");

  await db.transaction(async (tx) => {
    await tx.delete(darApprovals).where(and(eq(darApprovals.darMasterId, darId), eq(darApprovals.stepRole, "REVIEWER")));
    await tx.insert(darApprovals).values({ stepRole: "REVIEWER", action: "PENDING", assignedUserId: reviewerUserId, darMasterId: darId });
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
  const [dar] = await db.select({ id: darMasters.id, status: darMasters.status, requesterId: darMasters.requesterId })
    .from(darMasters).where(eq(darMasters.id, darId)).limit(1);

  if (!dar) throw new NotFoundError("DAR");

  const currentApprovals = await db.select({ id: darApprovals.id, stepRole: darApprovals.stepRole, action: darApprovals.action, assignedUserId: darApprovals.assignedUserId })
    .from(darApprovals).where(eq(darApprovals.darMasterId, darId)).orderBy(asc(darApprovals.id));

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
    const [cfg] = await db.select({ configValue: systemConfig.configValue })
      .from(systemConfig).where(eq(systemConfig.configKey, "CURRENT_MR_USER_ID")).limit(1);
    if (!cfg?.configValue) throw new AppError("ยังไม่ได้ตั้งค่า MR ในระบบ กรุณาติดต่อ QMS", 400);
    mrUserId = cfg.configValue;
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(darApprovals).set({ action: "APPROVED", actionDate: now, signatureUsedUrl: input.signatureDataUrl, signatureTypeUsed: input.signatureType })
      .where(eq(darApprovals.id, myStep.id));

    if (input.saveSignature) {
      await tx.update(users).set({ savedSignatureUrl: input.signatureDataUrl, signatureType: input.signatureType }).where(eq(users.id, userId));
    }

    if (createMrStep && mrUserId) {
      await tx.insert(darApprovals).values({ stepRole: "APPROVER_MR", action: "PENDING", assignedUserId: mrUserId, darMasterId: darId });
    }

    await tx.update(darMasters).set({ status: nextStatus }).where(eq(darMasters.id, darId));
  });

  const detail = await fetchDarDetail(darId);
  return detail!;
}

// ── Reject ────────────────────────────────────────────────────────────────────

export async function rejectDar(darId: string, userId: string, _reason: string): Promise<DarDetail> {
  const [dar] = await db.select({ id: darMasters.id, status: darMasters.status })
    .from(darMasters).where(eq(darMasters.id, darId)).limit(1);

  if (!dar) throw new NotFoundError("DAR");

  const currentApprovals = await db.select({ id: darApprovals.id, action: darApprovals.action, assignedUserId: darApprovals.assignedUserId })
    .from(darApprovals).where(eq(darApprovals.darMasterId, darId));

  const myStep = currentApprovals.find((a) => a.assignedUserId === userId && a.action === "PENDING");
  if (!myStep) throw new ForbiddenError("ไม่พบขั้นตอนที่รอการอนุมัติของคุณ");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(darApprovals).set({ action: "REJECTED", actionDate: now }).where(eq(darApprovals.id, myStep.id));
    await tx.update(darMasters).set({ status: "DRAFT" }).where(eq(darMasters.id, darId));
  });

  const detail = await fetchDarDetail(darId);
  return detail!;
}

// ── Reviewer candidates ───────────────────────────────────────────────────────

export async function getReviewerCandidates(): Promise<ReviewerCandidate[]> {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      employeeId: users.employeeId,
      msUserId: users.msUserId,
      departmentId: users.departmentId,
    })
    .from(users)
    .where(sql`${users.msUserId} is not null`)
    .orderBy(asc(users.name));

  const deptIds = [...new Set(result.map((u) => u.departmentId).filter(Boolean))] as string[];
  const depts = deptIds.length > 0
    ? await db.select({ id: departments.id, name: departments.name }).from(departments).where(inArray(departments.id, deptIds))
    : [];
  const deptMap = Object.fromEntries(depts.map((d) => [d.id, d]));

  return result.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    employeeId: u.employeeId,
    msUserId: u.msUserId,
    department: u.departmentId ? (deptMap[u.departmentId] ?? null) : null,
  })) as ReviewerCandidate[];
}

// ── Delete DRAFT ──────────────────────────────────────────────────────────────

export async function deleteDar(id: string, requesterId: string): Promise<void> {
  const [dar] = await db.select({ status: darMasters.status, requesterId: darMasters.requesterId })
    .from(darMasters).where(eq(darMasters.id, id)).limit(1);

  if (!dar) throw new NotFoundError("DAR");
  if (dar.requesterId !== requesterId) throw new ForbiddenError();
  if (dar.status !== "DRAFT") throw new ValidationError("ลบได้เฉพาะคำขอที่เป็นฉบับร่างเท่านั้น");

  const attachmentRows = await db.select({ spItemId: darAttachments.spItemId })
    .from(darAttachments).where(eq(darAttachments.darMasterId, id));

  if (attachmentRows.length > 0) {
    const { deleteSpItem } = await import("@/services/sharepoint");
    await Promise.allSettled(attachmentRows.map((a) => deleteSpItem(a.spItemId)));
  }

  await db.delete(darMasters).where(eq(darMasters.id, id));
}

// ── Saved signature ───────────────────────────────────────────────────────────

export async function getSavedSignature(userId: string): Promise<{ url: string; type: SignatureType } | null> {
  const [user] = await db.select({ savedSignatureUrl: users.savedSignatureUrl, signatureType: users.signatureType })
    .from(users).where(eq(users.id, userId)).limit(1);

  if (!user?.savedSignatureUrl || !user.signatureType) return null;
  return { url: user.savedSignatureUrl, type: user.signatureType };
}
