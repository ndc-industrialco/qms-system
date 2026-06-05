import { ConflictError, ForbiddenError, NotFoundError } from '@/errors/customErrors';
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
    return this.kpiRepo.create(dto);
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

  async submitObjectives(id: string, dto: SubmitKpiObjectivesDTO, preparerUserId: string) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.objectives.length === 0) throw new ConflictError('Cannot submit KPI with no objectives');
    const now = new Date();

    const preparer = await this.userRepo.findById(preparerUserId);
    const preparerName = preparer?.name || preparer?.email || '';

    return db.$transaction(async (tx) => {
      const updated = await this.kpiRepo.submitObjectives(id, {
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

      return updated;
    });
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

    return db.$transaction(async (tx) => {
      const updated = await this.kpiRepo.setStatus(id, 'PENDING_REVIEW', tx);
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

      return updated;
    });
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

    return db.$transaction(async (tx) => {
      const updated = await this.kpiRepo.setStatus(id, 'APPROVED', tx);
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

      return updated;
    });
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

  async rejectObjectives(id: string, actor: ActorContext) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW') throw new ConflictError('KPI cannot be rejected in current status');
    if (kpi.reviewerUserId !== actor.userId && kpi.approverUserId !== actor.userId) {
      throw new ForbiddenError('You are not assigned in this KPI workflow');
    }
    const rejectedStep = kpi.reviewerUserId === actor.userId ? 'REVIEWER' : 'APPROVER';
    return db.$transaction(async (tx) => {
      const updated = await this.kpiRepo.setStatus(id, 'REJECTED', tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: rejectedStep,
        signerUserId: actor.userId,
        action: 'REJECTED',
        actionDate: new Date(),
      }, tx);
      return updated;
    });
  }
}
