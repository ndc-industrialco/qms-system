import { ConflictError, ForbiddenError, NotFoundError } from '@/errors/customErrors';
import { AuditService } from '@/services/auditService';
import { NotificationService } from '@/services/notificationService';
import { sendKpiObjectiveReviewerAssignedEmail, sendKpiRecallEmail } from '@/services/email';
import { ActionTokenService } from '@/services/actionTokenService';
import { ApprovalModule, ApprovalStep } from '@/generated/prisma/client';
import { db } from '@/lib/db';
import { KpiRepository } from '@/repositories/kpiRepository';
import { KpiObjectiveRepository } from '@/repositories/kpiObjectiveRepository';
import { KpiMonthlyReportRepository } from '@/repositories/kpiMonthlyReportRepository';
import { KpiMonthlyDetailRepository } from '@/repositories/kpiMonthlyDetailRepository';
import { ApprovalSignatureRepository } from '@/repositories/approvalSignatureRepository';
import { UserRepository } from '@/repositories/userRepository';
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
        reviewerUser: k.reviewerUserId ? (userMap.get(k.reviewerUserId) ?? null) : null,
        approverUser: k.approverUserId ? (userMap.get(k.approverUserId) ?? null) : null,
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
      reviewerUser: kpi.reviewerUserId ? (userMap.get(kpi.reviewerUserId) ?? null) : null,
      approverUser: kpi.approverUserId ? (userMap.get(kpi.approverUserId) ?? null) : null,
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

    const [preparer, reviewer] = await Promise.all([
      this.userRepo.findById(preparerUserId),
      this.userRepo.findById(dto.reviewerUserId),
    ]);
    const preparerName = preparer?.name || preparer?.email || '';

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.submitObjectives(id, {
        prepareSignature: dto.prepareSignature,
        reviewerUserId: dto.reviewerUserId,
        approverUserId: dto.approverUserId,
        submittedAt: now,
        prepare: preparerName,
      }, tx);

      await this.approvalSignatureRepo.deleteByDocument('KPI', id, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'PREPARER',
        signerUserId: preparerUserId,
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
    const reviewerToken = reviewer?.email
      ? await ActionTokenService.issue({
          module: ApprovalModule.KPI,
          documentId: id,
          role: ApprovalStep.REVIEWER,
          issuedTo: dto.reviewerUserId,
        })
      : null;

    // Send notification outside transaction — idempotent via NotificationService
    if (reviewer?.email && reviewerToken) {
      NotificationService.sendEmailOnce(
        `KPI:${id}:SUBMITTED:reviewer:${dto.reviewerUserId}:${reviewerToken.substring(0, 16)}`,
        () => sendKpiObjectiveReviewerAssignedEmail({
          reviewer: { name: reviewer.name ?? '', email: reviewer.email },
          requesterName: preparerName,
          departmentName: updated.department,
          kpiId: updated.id,
          objectives: updated.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
          year: updated.yearly,
          actionToken: reviewerToken,
          senderEmail,
        }),
        reviewer.email,
        'KPI Review Request',
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
    if (kpi.reviewerUserId !== actor.userId) throw new ForbiddenError('You are not assigned as reviewer');

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'PENDING_REVIEW', tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'REVIEWER',
        signerUserId: actor.userId,
        action: 'APPROVED',
        actionDate: new Date(),
        signaturePath: sigBody?.signatureDataUrl,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        await this.userRepo.saveSignature(actor.userId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType ?? 'DRAW',
        }, tx);
      }

      await AuditService.record({
        actorUserId: actor.userId,
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
    if (kpi.approverUserId !== actor.userId) throw new ForbiddenError('You are not assigned as approver');

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
        action: 'APPROVED',
        actionDate: new Date(),
        signaturePath: sigBody?.signatureDataUrl,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        await this.userRepo.saveSignature(actor.userId, {
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
    if (!preparerSig || preparerSig.signerUserId !== actor.userId) {
      throw new ForbiddenError('Only the preparer can recall this KPI');
    }

    const notifyUserIds = [kpi.reviewerUserId, kpi.approverUserId].filter(Boolean) as string[];

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'DRAFT', tx);
      await this.kpiRepo.clearSubmission(id, tx);
      await this.approvalSignatureRepo.deleteByDocument('KPI', id, tx);

      await AuditService.record({
        actorUserId: actor.userId,
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
      const users = await Promise.all(notifyUserIds.map((uid) => this.userRepo.findById(uid)));
      const recipients = users.filter((u): u is NonNullable<typeof u> => Boolean(u?.email));

      for (const u of recipients) {
        NotificationService.sendEmailOnce(
          `KPI:${id}:RECALLED:notify:${u.id}`,
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
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    return { ...updated, notifyUserIds };
  }

  async rejectObjectives(id: string, actor: ActorContext) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW') throw new ConflictError('KPI cannot be rejected in current status');
    if (kpi.reviewerUserId !== actor.userId && kpi.approverUserId !== actor.userId) {
      throw new ForbiddenError('You are not assigned in this KPI workflow');
    }
    const rejectedStep = kpi.reviewerUserId === actor.userId ? 'REVIEWER' : 'APPROVER';
    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'REJECTED', tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: rejectedStep,
        signerUserId: actor.userId,
        action: 'REJECTED',
        actionDate: new Date(),
      }, tx);

      await AuditService.record({
        actorUserId: actor.userId,
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

    return { ...updated, objectives: kpi.objectives };
  }
}
