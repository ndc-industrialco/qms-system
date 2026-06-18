import { ConflictError, ForbiddenError, NotFoundError } from '@/errors/customErrors';
import { AuditService } from '@/services/auditService';
import { NotificationService } from '@/services/notificationService';
import { sendKpiObjectiveReviewerAssignedEmail, sendKpiRecallEmail, sendKpiObjectiveApproverRequestEmail, sendKpiResultEmail, sendKpiRejectedPreparerEmail } from '@/services/email';
import { ActionTokenService } from '@/services/actionTokenService';
import { ApprovalModule, ApprovalStep } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { KpiRepository } from '@/repositories/kpiRepository';
import { KpiObjectiveRepository } from '@/repositories/kpiObjectiveRepository';
import { KpiMonthlyReportRepository } from '@/repositories/kpiMonthlyReportRepository';
import { KpiMonthlyDetailRepository } from '@/repositories/kpiMonthlyDetailRepository';
import { ApprovalSignatureRepository } from '@/repositories/approvalSignatureRepository';
import { UserRepository } from '@/repositories/userRepository';
import { UserPreferenceRepository } from '@/repositories/userPreferenceRepository';
import { getUserSnapshot } from '@/lib/userSnapshotCache';
import { CreateKpiDTO, UpdateKpiDTO, CreateKpiObjectiveDTO, UpdateKpiObjectiveDTO, ListKpiQuery, SubmitKpiObjectivesDTO } from '@/types/kpi';
import type { ActorContext } from '@/types/kpi';
import type { Prisma, SignatureType } from '@/generated/prisma/client';

const KPI_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export class KpiService {
  private kpiRepo = new KpiRepository();
  private objectiveRepo = new KpiObjectiveRepository();
  private monthlyReportRepo = new KpiMonthlyReportRepository();
  private monthlyDetailRepo = new KpiMonthlyDetailRepository();
  private approvalSignatureRepo = new ApprovalSignatureRepository();
  private userRepo = new UserRepository();
  private userPrefRepo = new UserPreferenceRepository();

  async listKpis(query: ListKpiQuery) {
    const result = await this.kpiRepo.paginateKpis(query);

    const userIds = [
      ...new Set(
        result.data.flatMap(k => [k.reviewerUserId, k.approverUserId]).filter(Boolean) as string[],
      ),
    ];
    const users = userIds.length > 0
      ? await this.userRepo.findByIds(userIds)
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      ...result,
      data: result.data.map(k => ({
        ...k,
        reviewerUser: k.reviewerUserId
          ? (userMap.get(k.reviewerUserId) ?? (k.reviewerEmail ? { id: k.reviewerUserId, name: k.reviewer || null, email: k.reviewerEmail } : null))
          : null,
        approverUser: k.approverUserId
          ? (userMap.get(k.approverUserId) ?? (k.approverEmail ? { id: k.approverUserId, name: k.approver || null, email: k.approverEmail } : null))
          : null,
      })),
    };
  }

  async getKpiById(id: string) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);

    const signatures = await this.approvalSignatureRepo.findByDocument('KPI', id);

    const preparerSig = signatures.find(s => s.step === 'PREPARER');
    const userIds = [kpi.reviewerUserId, kpi.approverUserId, preparerSig?.signerUserId ?? null]
      .filter(Boolean) as string[];
    const users = userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const preparerUser = preparerSig?.signerUserId ? (userMap.get(preparerSig.signerUserId) ?? null) : null;
    const resolvedPrepare = kpi.prepare || preparerUser?.name || preparerUser?.email || '';

    return {
      ...kpi,
      prepare: resolvedPrepare,
      reviewerUser: kpi.reviewerUserId
        ? (userMap.get(kpi.reviewerUserId) ?? (kpi.reviewerEmail ? { id: kpi.reviewerUserId, name: kpi.reviewer || null, email: kpi.reviewerEmail } : null))
        : null,
      approverUser: kpi.approverUserId
        ? (userMap.get(kpi.approverUserId) ?? (kpi.approverEmail ? { id: kpi.approverUserId, name: kpi.approver || null, email: kpi.approverEmail } : null))
        : null,
      approvalSignatures: signatures,
    };
  }

  async createKpi(dto: CreateKpiDTO) {
    const existing = await this.kpiRepo.findByDepartmentYear(dto.department, dto.yearly);
    if (existing) throw new ConflictError(`KPI for ${dto.department} in ${dto.yearly} already exists`);
    try {
      return await this.kpiRepo.create(dto);
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictError(`KPI for ${dto.department} in ${dto.yearly} already exists`);
      }
      throw error;
    }
  }

  async updateKpi(id: string, dto: UpdateKpiDTO) {
    await this.getKpiById(id);
    return this.kpiRepo.update(id, dto);
  }

  async deleteKpi(id: string) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.monthlyReports.length > 0) {
      throw new ConflictError('Cannot delete KPI with existing monthly reports');
    }
    return this.kpiRepo.delete(id);
  }

  async addObjective(dto: CreateKpiObjectiveDTO) {
    await this.getKpiById(dto.kpiId);
    return this.objectiveRepo.createObjective(dto);
  }

  async updateObjective(id: string, dto: UpdateKpiObjectiveDTO) {
    const obj = await this.objectiveRepo.findById(id);
    if (!obj) throw new NotFoundError(`KPI Objective ${id} not found`);
    return this.objectiveRepo.update(id, dto);
  }

  async deleteObjective(id: string) {
    const obj = await this.objectiveRepo.findById(id);
    if (!obj) throw new NotFoundError(`KPI Objective ${id} not found`);
    const hasDetails = await this.objectiveRepo.hasMonthlyDetails(id);
    if (hasDetails) throw new ConflictError('Cannot delete objective with existing monthly details');
    return this.objectiveRepo.delete(id);
  }

  async getObjectivesByKpiId(kpiId: string) {
    await this.getKpiById(kpiId);
    return this.objectiveRepo.findByKpiId(kpiId);
  }

  async getObjectiveById(id: string) {
    const obj = await this.objectiveRepo.findByIdWithDetails(id);
    if (!obj) throw new NotFoundError(`KPI Objective ${id} not found`);
    return obj;
  }

  async submitObjectives(
    id: string,
    dto: SubmitKpiObjectivesDTO,
    preparerUserId: string,
    senderEmail?: string,
  ) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.objectives.length === 0) throw new ConflictError('Cannot submit KPI with no objectives');
    const now = new Date();

    const [preparer, preparerSnapshot] = await Promise.all([
      this.userRepo.findByAuthUserId(preparerUserId),
      getUserSnapshot(preparerUserId),
    ]);
    const preparerName = preparer?.name || preparer?.email || preparerSnapshot?.name || preparerSnapshot?.email || '';
    const reviewerName = dto.reviewerName?.trim() || dto.reviewerEmail || '';
    const approverName = dto.approverName?.trim() || dto.approverEmail || '';

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.submitObjectives(id, {
        prepareSignature: dto.prepareSignature,
        reviewerUserId: dto.reviewerUserId,
        reviewerAuthUserId: dto.reviewerAuthUserId ?? dto.reviewerUserId,
        reviewer: reviewerName,
        reviewerEmail: dto.reviewerEmail ?? null,
        approverUserId: dto.approverUserId,
        approverAuthUserId: dto.approverAuthUserId ?? dto.approverUserId,
        approver: approverName,
        approverEmail: dto.approverEmail ?? null,
        submittedAt: now,
        prepare: preparerName,
      }, tx);

      await this.approvalSignatureRepo.deleteByDocument('KPI', id, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'PREPARER',
        signerUserId: preparerUserId,
        signerAuthUserId: dto.preparerAuthUserId ?? null,
        action: 'APPROVED',
        actionDate: now,
        signaturePath: dto.prepareSignature,
      }, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'REVIEWER',
        signerUserId: dto.reviewerUserId,
        action: 'PENDING',
      }, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'APPROVER',
        signerUserId: dto.approverUserId,
        action: 'PENDING',
      }, tx);

      await AuditService.record({
        actorUserId: preparerUserId,
        actorAuthUserId: dto.preparerAuthUserId,
        actorRole: 'PREPARER',
        action: 'SUBMIT',
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
      }, tx);

      return result;
    });

    // Revoke any existing tokens, then issue fresh reviewer token
    await ActionTokenService.revokeByDocument(ApprovalModule.KPI, id);
    const reviewerToken = dto.reviewerEmail
      ? await ActionTokenService.issue({
          module: ApprovalModule.KPI,
          documentId: id,
          role: ApprovalStep.REVIEWER,
          issuedTo: dto.reviewerUserId,
        })
      : null;

    // Send notification outside transaction — idempotent via NotificationService
    if (dto.reviewerEmail && reviewerToken) {
      NotificationService.sendEmailOnce(
        `KPI:${id}:SUBMITTED:reviewer:${dto.reviewerUserId}:${reviewerToken.substring(0, 16)}`,
        () => sendKpiObjectiveReviewerAssignedEmail({
          reviewer: { name: reviewerName, email: dto.reviewerEmail! },
          requesterName: preparerName,
          departmentName: updated.department,
          kpiId: updated.id,
          objectives: updated.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
          year: updated.yearly,
          actionToken: reviewerToken,
          senderEmail,
        }),
        dto.reviewerEmail,
        'KPI Review Request',
        dto.reviewerUserId,
        {
          title: "มี KPI รอการ Review",
          body: `KPI ${updated.department} ${updated.yearly}`,
          module: "KPI",
          resourceId: id,
          resourceType: "KPI",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    return updated;
  }

  async reviewObjectives(
    id: string,
    actor: ActorContext,
    sigBody?: { signatureDataUrl?: string; signatureType?: SignatureType; saveSignature?: boolean }
  ) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW') throw new ConflictError('KPI is not pending review');
    const reviewerAuthId = (kpi as Record<string, unknown>).reviewerAuthUserId as string | null | undefined;
    const isReviewer = (actor.authUserId && reviewerAuthId)
      ? reviewerAuthId === actor.authUserId
      : kpi.reviewerUserId === actor.userId;
    if (!isReviewer) throw new ForbiddenError('You are not assigned as reviewer');

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'PENDING_REVIEW', tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'REVIEWER',
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'APPROVED',
        actionDate: new Date(),
        signaturePath: sigBody?.signatureDataUrl,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        await this.userPrefRepo.upsertSignature(actor.userId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType ?? 'DRAW',
        }, tx);
      }

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'REVIEW',
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
      }, tx);

      return result;
    });

    // Issue approver token after reviewer signs off
    const approverToken = kpi.approverUserId
      ? await ActionTokenService.issue({
          module: ApprovalModule.KPI,
          documentId: id,
          role: ApprovalStep.APPROVER,
          issuedTo: kpi.approverUserId,
        })
      : undefined;

    // Notify approver
    if (kpi.approverUserId && kpi.approverEmail && approverToken) {
      NotificationService.sendEmailOnce(
        `KPI:${id}:REVIEWED:approver:${kpi.approverUserId}`,
        () => sendKpiObjectiveApproverRequestEmail({
          approver: { name: kpi.approver ?? '', email: kpi.approverEmail! },
          reviewerName: actor.name ?? '',
          departmentName: kpi.department,
          objectives: kpi.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
          year: kpi.yearly,
          actionToken: approverToken,
          senderEmail: actor.email,
        }),
        kpi.approverEmail,
        'KPI Approval Request',
        kpi.approverUserId,
        { title: 'มี KPI รอการอนุมัติ', body: `KPI ${kpi.department} ${kpi.yearly}`, module: 'KPI', resourceId: id, resourceType: 'KPI' },
      ).catch(() => {});
    }

    return { ...updated, objectives: kpi.objectives, approverToken };
  }

  async approveObjectives(
    id: string,
    actor: ActorContext,
    sigBody?: { signatureDataUrl?: string; signatureType?: SignatureType; saveSignature?: boolean }
  ) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW') throw new ConflictError('KPI is not pending approval');
    const approverAuthId = (kpi as Record<string, unknown>).approverAuthUserId as string | null | undefined;
    const isApprover = (actor.authUserId && approverAuthId)
      ? approverAuthId === actor.authUserId
      : kpi.approverUserId === actor.userId;
    if (!isApprover) throw new ForbiddenError('You are not assigned as approver');

    const signatures = await this.approvalSignatureRepo.findByDocument('KPI', id);
    const reviewerSig = signatures.find(s => s.step === 'REVIEWER');
    if (!reviewerSig || reviewerSig.action !== 'APPROVED') {
      throw new ConflictError('Reviewer must approve before approver can proceed');
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'APPROVED', tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'APPROVER',
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'APPROVED',
        actionDate: new Date(),
        signaturePath: sigBody?.signatureDataUrl,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        await this.userPrefRepo.upsertSignature(actor.userId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType ?? 'DRAW',
        }, tx);
      }

      await this.generateMonthlyReportsForApprovedKpi({
        kpiId: kpi.id,
        year: kpi.yearly,
        objectiveIds: kpi.objectives.map((objective) => objective.id),
      }, tx);

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'APPROVE',
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
      }, tx);

      return result;
    });

    // Approved — no more actions needed, revoke any remaining tokens
    await ActionTokenService.revokeByDocument(ApprovalModule.KPI, id);

    // Notify preparer
    const preparerSig = signatures.find((s) => s.step === 'PREPARER');
    const preparerAuthId = (preparerSig as Record<string, unknown>)?.signerAuthUserId as string | null | undefined;
    if (preparerAuthId) {
      const preparer = await getUserSnapshot(preparerAuthId);
      if (preparer?.email) {
        NotificationService.sendEmailOnce(
          `KPI:${id}:APPROVED:preparer:${preparerAuthId}`,
          () => sendKpiResultEmail({
            to: { name: preparer.name ?? '', email: preparer.email },
            departmentName: kpi.department,
            year: kpi.yearly,
            status: 'APPROVED',
            actorName: actor.name ?? '',
            kpiId: id,
            objectives: kpi.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
            senderEmail: actor.email,
          }),
          preparer.email,
          'KPI Approved',
          preparerAuthId,
          { title: 'KPI ได้รับการอนุมัติแล้ว', body: `KPI ${kpi.department} ${kpi.yearly} ได้รับการอนุมัติ`, module: 'KPI', resourceId: id, resourceType: 'KPI' },
        ).catch(() => {});
      }
    }

    return { ...updated, objectives: kpi.objectives };
  }

  private async generateMonthlyReportsForApprovedKpi(
    payload: { kpiId: string; year: number; objectiveIds: string[] },
    tx: Prisma.TransactionClient,
  ) {
    for (const month of KPI_MONTHS) {
      const report = await this.monthlyReportRepo.findOrCreate(payload.kpiId, month, payload.year, tx);
      await this.monthlyDetailRepo.createManyForReport(report.id, payload.objectiveIds, tx);
    }
  }

  async recallObjectives(id: string, actor: ActorContext) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW') throw new ConflictError('KPI can only be recalled when pending review');

    const signatures = await this.approvalSignatureRepo.findByDocument('KPI', id);
    const preparerSig = signatures.find(s => s.step === 'PREPARER');
    const preparerSigAuthId = (preparerSig as Record<string, unknown> | undefined)?.signerAuthUserId as string | null | undefined;
    const isPreparer = preparerSig && (
      (actor.authUserId && preparerSigAuthId)
        ? preparerSigAuthId === actor.authUserId
        : preparerSig.signerUserId === actor.userId
    );
    if (!isPreparer) {
      throw new ForbiddenError('Only the preparer can recall this KPI');
    }

    const notifyUserIds = [kpi.reviewerUserId, kpi.approverUserId].filter(Boolean) as string[];

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'DRAFT', tx);
      await this.kpiRepo.clearSubmission(id, tx);
      await this.approvalSignatureRepo.deleteByDocument('KPI', id, tx);

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'RECALL',
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
      }, tx);

      return result;
    });

    // Revoke all tokens immediately — reviewer link in inbox is now invalid
    await ActionTokenService.revokeByDocument(ApprovalModule.KPI, id);

    // Send notifications outside transaction — idempotent via NotificationService
    if (notifyUserIds.length > 0) {
      const snapshots = await Promise.all(notifyUserIds.map((uid) => getUserSnapshot(uid)));
      for (let i = 0; i < notifyUserIds.length; i++) {
        const u = snapshots[i];
        const authId = notifyUserIds[i];
        if (!u?.email) continue;
        NotificationService.sendEmailOnce(
          `KPI:${id}:RECALLED:notify:${authId}`,
          () => sendKpiRecallEmail({
            to: { name: u.name ?? '', email: u.email },
            departmentName: kpi.department,
            year: kpi.yearly,
            preparerName: actor.name ?? '',
            kpiId: id,
            senderEmail: actor.email,
          }),
          u.email,
          'KPI Recalled',
          authId,
          {
            title: "KPI ถูก Recall",
            body: `KPI ${kpi.department} ${kpi.yearly}`,
            module: "KPI",
            resourceId: id,
            resourceType: "KPI",
          },
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    return { ...updated, notifyUserIds };
  }

  async rejectObjectives(id: string, actor: ActorContext) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW') throw new ConflictError('KPI cannot be rejected in current status');
    const rejectReviewerAuthId = (kpi as Record<string, unknown>).reviewerAuthUserId as string | null | undefined;
    const rejectApproverAuthId = (kpi as Record<string, unknown>).approverAuthUserId as string | null | undefined;
    const isRejectReviewer = (actor.authUserId && rejectReviewerAuthId)
      ? rejectReviewerAuthId === actor.authUserId : kpi.reviewerUserId === actor.userId;
    const isRejectApprover = (actor.authUserId && rejectApproverAuthId)
      ? rejectApproverAuthId === actor.authUserId : kpi.approverUserId === actor.userId;
    if (!isRejectReviewer && !isRejectApprover) {
      throw new ForbiddenError('You are not assigned in this KPI workflow');
    }
    const rejectedStep = isRejectReviewer ? 'REVIEWER' : 'APPROVER';
    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'REJECTED', tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: rejectedStep,
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'REJECTED',
        actionDate: new Date(),
      }, tx);

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'REJECT',
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
        metadata: { step: rejectedStep },
      }, tx);

      return result;
    });

    // Revoke all tokens — preparer must re-submit to get a new reviewer link
    await ActionTokenService.revokeByDocument(ApprovalModule.KPI, id);

    // Notify preparer
    const rejectSignatures = await this.approvalSignatureRepo.findByDocument('KPI', id) ?? [];
    const rejectPreparerSig = rejectSignatures.find((s) => s.step === 'PREPARER');
    const rejectPreparerAuthId = (rejectPreparerSig as Record<string, unknown>)?.signerAuthUserId as string | null | undefined;
    if (rejectPreparerAuthId) {
      const preparer = await getUserSnapshot(rejectPreparerAuthId);
      if (preparer?.email) {
        NotificationService.sendEmailOnce(
          `KPI:${id}:REJECTED:preparer:${rejectPreparerAuthId}`,
          () => sendKpiRejectedPreparerEmail({
            to: { name: preparer.name ?? '', email: preparer.email },
            departmentName: kpi.department,
            year: kpi.yearly,
            actorName: actor.name ?? '',
            kpiId: id,
            objectives: kpi.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
            senderEmail: actor.email,
          }),
          preparer.email,
          'KPI Rejected',
          rejectPreparerAuthId,
          { title: 'KPI ถูกปฏิเสธ', body: `KPI ${kpi.department} ${kpi.yearly} ถูกปฏิเสธ`, module: 'KPI', resourceId: id, resourceType: 'KPI' },
        ).catch(() => {});
      }
    }

    return { ...updated, objectives: kpi.objectives };
  }
}
