import { db } from "@/lib/db";
import { DarRepository } from "@/repositories/darRepository";
import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { UserRepository } from "@/repositories/userRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { NotFoundError, ValidationError, ForbiddenError, AppError } from "@/errors/customErrors";
import type { DarDetail, DarSummary, CreateDarInput, DarApprovalRow, ReviewerCandidate, DarAttachmentRow, TempAttachmentInput } from "@/types/dar";
import { Prisma, type DarStatus, type SignatureType } from "@/generated/prisma/client";
import { redis } from "@/lib/redis";

type DarDetailRaw = NonNullable<Awaited<ReturnType<DarRepository["findDetailById"]>>>;
type DarApprovalRaw = DarDetailRaw["approvals"][number];

type ApproveDarInput = {
  signatureDataUrl: string;
  signatureType: SignatureType;
  saveSignature: boolean;
  comment: string | null;
};

type MovedAttachmentResult = {
  t: TempAttachmentInput;
  moved: { spWebUrl: string; spDownloadUrl: string };
  targetPath: string;
};

export class DarService {
  private darRepo = new DarRepository();
  private configRepo = new SystemConfigRepository();
  private userRepo = new UserRepository();
  private deptRepo = new DepartmentRepository();

  private mapApproval(a: DarApprovalRaw): DarApprovalRow {
    return {
      id: a.id,
      stepRole: a.stepRole,
      action: a.action,
      actionDate: a.actionDate?.toISOString() ?? null,
      signatureUsedUrl: a.signatureUsedUrl,
      signatureTypeUsed: a.signatureTypeUsed,
      comment: a.comment,
      assignedUser: a.assignedUser,
    };
  }

  private async fetchDarDetail(id: string, tx?: Prisma.TransactionClient): Promise<DarDetail | null> {
    const master = await this.darRepo.findDetailById(id, tx);
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
      items: master.items.map((i: DarDetailRaw["items"][number]) => ({
        itemNo: i.itemNo,
        docNumber: i.docNumber,
        docName: i.docName,
        revision: i.revision,
      })),
      distributions: master.distributions.map((d: DarDetailRaw["distributions"][number]) => ({
        departmentId: d.departmentId,
        department: { id: d.department.id, name: d.department.name },
      })),
      approvals: master.approvals.map((a: DarDetailRaw["approvals"][number]) =>
        this.mapApproval({
          id: a.id,
          stepRole: a.stepRole,
          action: a.action,
          actionDate: a.actionDate,
          signatureUsedUrl: a.signatureUsedUrl,
          signatureTypeUsed: a.signatureTypeUsed,
          comment: a.comment,
          assignedUser: {
            id: a.assignedUser.id,
            name: a.assignedUser.name,
            employeeId: a.assignedUser.employeeId,
            department: a.assignedUser.department ?? null,
          },
        })
      ),
      attachments: master.attachments.map((a: DarDetailRaw["attachments"][number]): DarAttachmentRow => ({
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

  async getAllDars(): Promise<DarSummary[]> {
    const masters = await this.darRepo.findManySummary();
    return (masters as Array<{
      id: string;
      darNo: string | null;
      requestDate: Date;
      objective: string;
      docType: string;
      status: DarStatus;
      _count: { items: number };
    }>).map((r) => ({
      id: r.id,
      darNo: r.darNo,
      requestDate: r.requestDate.toISOString(),
      objective: r.objective as DarSummary["objective"],
      docType: r.docType as DarSummary["docType"],
      status: r.status,
      itemCount: r._count.items,
    }));
  }

  async getDarsByRequesterId(
    requesterId: string,
    page: number,
    limit: number
  ): Promise<{ dars: DarSummary[]; total: number }> {
    const skip = (page - 1) * limit;
    const [masters, total] = await Promise.all([
      this.darRepo.findManyByRequester(requesterId, skip, limit),
      this.darRepo.countByRequester(requesterId),
    ]);

    return {
      dars: (masters as Array<{
        id: string;
        darNo: string | null;
        requestDate: Date;
        objective: string;
        docType: string;
        status: DarStatus;
        _count: { items: number };
      }>).map((r) => ({
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

  async getDarById(id: string, requesterId: string, isPrivileged = false): Promise<DarDetail> {
    const detail = await this.fetchDarDetail(id);
    if (!detail) throw new NotFoundError("DAR");

    const isAssignedApprover = detail.approvals.some((a) => a.assignedUser.id === requesterId);
    if (!isPrivileged && detail.requester.id !== requesterId && !isAssignedApprover) {
      throw new ForbiddenError();
    }

    return detail;
  }

  async createDar(requesterId: string, departmentId: string, input: CreateDarInput): Promise<DarDetail> {
    const dept = await this.deptRepo.findById(departmentId);

    const newDar = await this.darRepo.create({
      objective: input.objective,
      docType: input.docType,
      docTypeOther: input.docTypeOther ?? null,
      reason: input.reason,
      status: "DRAFT" as DarStatus,
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
    });

    if (input.tempAttachments && input.tempAttachments.length > 0 && dept) {
      await this.adoptTempAttachments({
        darId: newDar.id,
        darNo: newDar.darNo ?? newDar.id,
        uploadedById: requesterId,
        departmentName: dept.name,
        objective: input.objective,
        docType: input.docType,
        tempAttachments: input.tempAttachments,
      });
    }

    const detail = await this.fetchDarDetail(newDar.id);
    return detail!;
  }

  private async adoptTempAttachments(opts: {
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
      })
    );

    const toCreate = results
      .filter((r): r is PromiseFulfilledResult<MovedAttachmentResult> => r.status === "fulfilled")
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
      await db.$transaction(async (tx) => {
        await this.darRepo.createAttachments(toCreate, tx);
      });
    }

    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`[adoptTempAttachments] Failed to move temp file #${i}:`, r.reason);
    });
  }

  async updateDarDraft(
    id: string,
    requesterId: string,
    input: Partial<CreateDarInput>,
    isPrivileged = false
  ): Promise<DarDetail> {
    const existing = await this.darRepo.findById(id);

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
        await this.darRepo.update(id, updateData, tx);
      }

      if (input.items !== undefined) {
        await this.darRepo.deleteItemsByDarId(id, tx);
        if (input.items.length > 0) {
          const itemsData = input.items.map((item, idx) => ({
            itemNo: idx + 1,
            docNumber: item.docNumber,
            docName: item.docName,
            revision: item.revision,
            darMasterId: id,
          }));
          await this.darRepo.createItems(itemsData, tx);
        }
      }

      if (input.distributionDepartmentIds !== undefined) {
        await this.darRepo.deleteDistributionsByDarId(id, tx);
        if (input.distributionDepartmentIds.length > 0) {
          const distributionsData = input.distributionDepartmentIds.map((deptId) => ({
            darMasterId: id,
            departmentId: deptId,
          }));
          await this.darRepo.createDistributions(distributionsData, tx);
        }
      }
    });

    const detail = await this.fetchDarDetail(id);
    return detail!;
  }

  private async generateDarNo(year: number, tx: Prisma.TransactionClient): Promise<string> {
    const counterKey = `DAR_COUNTER_${year}`;
    const existingValue = await this.configRepo.findValueByKey(counterKey, tx);
    const nextSeq = existingValue ? parseInt(existingValue, 10) + 1 : 1;

    await this.configRepo.upsertConfig(
      counterKey,
      String(nextSeq),
      `DAR counter for ${year}`,
      tx
    );

    return `DAR-${year}-${String(nextSeq).padStart(4, "0")}`;
  }

  async submitDar(id: string, requesterId: string): Promise<DarDetail> {
    const existing = await this.darRepo.findById(id);

    if (!existing) throw new NotFoundError("DAR");
    if (existing.requesterId !== requesterId) throw new ForbiddenError();
    if (existing.status !== "DRAFT") throw new ValidationError("Only DRAFT requests can be submitted");

    const year = new Date().getFullYear();

    await db.$transaction(async (tx) => {
      const darNo = existing.darNo || await this.generateDarNo(year, tx);
      await this.darRepo.update(id, { status: "PENDING_REVIEW" as DarStatus, darNo }, tx);
      await this.darRepo.deleteApprovalsByDarId(id, tx);
      await this.darRepo.createApproval(
        { stepRole: "PREPARER", action: "PENDING", assignedUserId: requesterId, darMasterId: id },
        tx
      );
    });

    const detail = await this.fetchDarDetail(id);
    return detail!;
  }

  async assignReviewer(darId: string, requesterId: string, reviewerUserId: string): Promise<DarDetail> {
    const dar = await this.darRepo.findById(darId);

    if (!dar) throw new NotFoundError("DAR");
    if (dar.requesterId !== requesterId) throw new ForbiddenError();
    if (dar.status !== "PENDING_REVIEW") throw new ValidationError("DAR ต้องอยู่ในสถานะ PENDING_REVIEW");

    const currentApprovals = await this.darRepo.findApprovalsByDarId(darId);
    const preparer = currentApprovals.find((a) => a.stepRole === "PREPARER");
    if (!preparer || preparer.action !== "APPROVED") throw new ValidationError("ผู้จัดทำต้องยืนยันก่อนกำหนดผู้ตรวจสอบ");

    const reviewer = await this.userRepo.findById(reviewerUserId);
    if (!reviewer) throw new NotFoundError("ผู้ตรวจสอบ");

    await db.$transaction(async (tx) => {
      await this.darRepo.deleteApprovalsByDarIdExceptPreparer(darId, tx);
      await this.darRepo.createApproval(
        { stepRole: "REVIEWER", action: "PENDING", assignedUserId: reviewerUserId, darMasterId: darId },
        tx
      );
    });

    const detail = await this.fetchDarDetail(darId);
    return detail!;
  }

  async approveDar(darId: string, userId: string, input: ApproveDarInput): Promise<DarDetail> {
    const dar = await this.darRepo.findById(darId);
    if (!dar) throw new NotFoundError("DAR");

    const currentApprovals = await this.darRepo.findApprovalsByDarId(darId);
    const myStep = currentApprovals.find((a) => a.assignedUserId === userId && a.action === "PENDING");
    if (!myStep) throw new ForbiddenError("ไม่พบขั้นตอนที่รอการอนุมัติของคุณ");

    if (myStep.stepRole === "PREPARER" && dar.status !== "PENDING_REVIEW") throw new ValidationError("สถานะ DAR ไม่ถูกต้อง");
    if (myStep.stepRole === "REVIEWER" && dar.status !== "PENDING_REVIEW") throw new ValidationError("สถานะ DAR ไม่ถูกต้อง");
    if (myStep.stepRole === "APPROVER_MR" && dar.status !== "PENDING_APPROVE") throw new ValidationError("สถานะ DAR ไม่ถูกต้อง");

    let nextStatus: DarStatus = dar.status;
    let createMrStep = false;

    if (myStep.stepRole === "PREPARER") {
      nextStatus = "PENDING_REVIEW" as DarStatus;
    } else if (myStep.stepRole === "REVIEWER") {
      nextStatus = "PENDING_APPROVE" as DarStatus;
      createMrStep = true;
    } else if (myStep.stepRole === "APPROVER_MR") {
      nextStatus = "QMS_PROCESSING" as DarStatus;
    }

    let mrUserId: string | null = null;
    if (createMrStep) {
      // Try Redis cache first (MR config rarely changes)
      const MR_CACHE_KEY = "qms:config:CURRENT_MR_USER_ID";
      try {
        const cached = await redis.get(MR_CACHE_KEY);
        if (cached) {
          mrUserId = cached;
        } else {
          mrUserId = await this.configRepo.findValueByKey("CURRENT_MR_USER_ID");
          if (mrUserId) await redis.set(MR_CACHE_KEY, mrUserId, "EX", 300).catch(() => null);
        }
      } catch {
        mrUserId = await this.configRepo.findValueByKey("CURRENT_MR_USER_ID");
      }
      if (!mrUserId) throw new AppError("ยังไม่ได้ตั้งค่า MR ในระบบ กรุณาติดต่อ QMS", 400);
    }

    const now = new Date();
    await db.$transaction(async (tx) => {
      await this.darRepo.updateApproval(
        myStep.id,
        {
          action: "APPROVED",
          actionDate: now,
          signatureUsedUrl: input.signatureDataUrl,
          signatureTypeUsed: input.signatureType,
          comment: input.comment ?? null,
        },
        tx
      );

      if (input.saveSignature) {
        await this.userRepo.updateProfile(
          userId,
          { savedSignatureUrl: input.signatureDataUrl, signatureType: input.signatureType },
          tx
        );
      }

      if (createMrStep && mrUserId) {
        await this.darRepo.createApproval(
          { stepRole: "APPROVER_MR", action: "PENDING", assignedUserId: mrUserId, darMasterId: darId },
          tx
        );
      }

      await this.darRepo.update(darId, { status: nextStatus }, tx);
    });

    const detail = await this.fetchDarDetail(darId);
    return detail!;
  }

  async rejectDar(darId: string, userId: string, comment: string): Promise<DarDetail> {
    const dar = await this.darRepo.findById(darId);
    if (!dar) throw new NotFoundError("DAR");

    const myStep = await this.darRepo.findPendingApproval(darId, userId);
    if (!myStep) throw new ForbiddenError("ไม่พบขั้นตอนที่รอการอนุมัติของคุณ");

    const now = new Date();
    await db.$transaction(async (tx) => {
      await this.darRepo.updateApproval(myStep.id, { action: "REJECTED", actionDate: now, comment }, tx);
      await this.darRepo.update(darId, { status: "DRAFT" as DarStatus }, tx);
    });

    const detail = await this.fetchDarDetail(darId);
    return detail!;
  }

  async getReviewerCandidates(): Promise<ReviewerCandidate[]> {
    const CACHE_KEY = "qms:dar:reviewer_candidates";
    const CACHE_TTL = 120; // 2 minutes

    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return JSON.parse(cached) as ReviewerCandidate[];
    } catch {
      // Redis unavailable — fall through to DB
    }

    const users = await this.userRepo.findManyWithDept();
    const candidates = (users as Array<{
      id: string;
      name: string | null;
      email: string;
      employeeId: string | null;
      role: string;
      msUserId: string | null;
      department: { id: string; name: string } | null;
      createdAt: Date;
    }>).filter((u) => u.msUserId !== null);

    const result: ReviewerCandidate[] = candidates.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      employeeId: u.employeeId,
      msUserId: u.msUserId!,
      department: u.department ?? null,
    }));

    try {
      await redis.set(CACHE_KEY, JSON.stringify(result), "EX", CACHE_TTL);
    } catch {
      // Cache write failure is non-fatal
    }

    return result;
  }

  async deleteDar(id: string, requesterId: string, isPrivileged = false): Promise<void> {
    const dar = await this.darRepo.findById(id);

    if (!dar) throw new NotFoundError("DAR");
    if (!isPrivileged && dar.requesterId !== requesterId) throw new ForbiddenError();
    if (!isPrivileged && dar.status !== "DRAFT") throw new ValidationError("ลบได้เฉพาะคำขอที่เป็นฉบับร่างเท่านั้น");

    const attachments = await this.darRepo.findAttachmentsByDarId(id);
    if (attachments.length > 0) {
      const { deleteSpItem } = await import("@/services/sharepoint");
      await Promise.allSettled(attachments.map((a) => deleteSpItem(a.spItemId)));
    }

    await db.$transaction(async (tx) => {
      await this.darRepo.deleteApprovalsByDarId(id, tx);
      await this.darRepo.deleteAttachmentsByDarId(id, tx);
      await this.darRepo.deleteItemsByDarId(id, tx);
      await this.darRepo.deleteDistributionsByDarId(id, tx);
      await this.darRepo.delete(id, tx);
    });
  }

  async getSavedSignature(userId: string): Promise<{ url: string; type: SignatureType } | null> {
    const user = await this.userRepo.findById(userId);
    if (!user?.savedSignatureUrl || !user.signatureType) return null;
    return { url: user.savedSignatureUrl, type: user.signatureType };
  }
}
