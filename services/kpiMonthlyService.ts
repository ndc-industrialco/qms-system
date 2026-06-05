import { ConflictError, ForbiddenError, NotFoundError } from '@/errors/customErrors';
import { db } from '@/lib/db'; // used only for $transaction boundaries
import { ensureMonthlyStatusTransition } from '@/lib/kpi-state-machine';
import { KpiMonthlyReportRepository } from '@/repositories/kpiMonthlyReportRepository';
import { KpiMonthlyDetailRepository } from '@/repositories/kpiMonthlyDetailRepository';
import { KpiCorrectiveActionRepository } from '@/repositories/kpiCorrectiveActionRepository';
import { KpiObjectiveRepository } from '@/repositories/kpiObjectiveRepository';
import { ApprovalSignatureRepository } from '@/repositories/approvalSignatureRepository';
import { UserRepository } from '@/repositories/userRepository';
import { ActorContext, CreateMonthlyReportDTO, CreateCorrectiveActionDTO, ListMonthlyQuery, UpdateMonthlyDetailDTO, UpdateMonthlyReportDTO } from '@/types/kpi';
import type { SignatureType } from '@/generated/prisma/client';
import { ALLOWED_MIME, MAX_FILE_SIZE, hasValidMagicBytes } from '@/lib/fileValidation';
import { uploadFileToKpiMonthly } from '@/services/sharepoint';
import { ValidationError } from '@/errors/customErrors';

export class KpiMonthlyService {
  private reportRepo = new KpiMonthlyReportRepository();
  private detailRepo = new KpiMonthlyDetailRepository();
  private correctiveRepo = new KpiCorrectiveActionRepository();
  private objectiveRepo = new KpiObjectiveRepository();
  private approvalSignatureRepo = new ApprovalSignatureRepository();
  private userRepo = new UserRepository();

  async createMonthlyReport(dto: CreateMonthlyReportDTO) {
    const existing = await this.reportRepo.findByCompositeKey(dto.kpiId, dto.month, dto.year);
    if (existing) throw new ConflictError(`Monthly report for ${dto.month} ${dto.year} already exists`);

    const objectives = await this.objectiveRepo.findByKpiId(dto.kpiId);

    return db.$transaction(async (tx) => {
      const report = await this.reportRepo.createReport(dto.kpiId, dto.month, dto.year, tx);

      for (const obj of objectives) {
        await this.detailRepo.createForReport(report.id, obj.id, tx);
      }

      return this.reportRepo.findByIdWithDetails(report.id, tx);
    });
  }

  async listReports(query: ListMonthlyQuery) {
    return this.reportRepo.paginateReports(query);
  }

  async getReportById(id: string) {
    const report = await this.reportRepo.findByIdWithDetails(id);
    if (!report) throw new NotFoundError(`Monthly report ${id} not found`);
    return report;
  }

  async updateDetail(detailId: string, dto: UpdateMonthlyDetailDTO) {
    const detail = await this.detailRepo.findByIdWithReport(detailId);
    if (!detail) throw new NotFoundError(`Monthly detail ${detailId} not found`);
    if (detail.monthlyReport.status !== 'DRAFT' && detail.monthlyReport.status !== 'REJECTED') {
      throw new ConflictError('Can only edit details in DRAFT or REJECTED reports');
    }

    if (dto.actualResult !== undefined && dto.actualResult !== null) {
      return this.detailRepo.autoSetAchievedStatus(detailId, detail.kpiObjective.target, dto.actualResult);
    }

    return this.detailRepo.updateResult(detailId, {
      actualResult: dto.actualResult,
      achievedStatus: dto.actualResult === null ? 'PENDING' : dto.achievedStatus,
    });
  }

  async updateReportMetadata(reportId: string, dto: UpdateMonthlyReportDTO, actor: ActorContext) {
    const report = await this.getReportById(reportId);
    this.ensureReportEditableByActor(report, actor);
    return this.reportRepo.updateMetadata(reportId, dto);
  }

  async uploadReportAttachment(reportId: string, file: File, actor: ActorContext) {
    const report = await this.getReportById(reportId);
    this.ensureReportEditableByActor(report, actor);

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }
    if (!ALLOWED_MIME.has(file.type)) {
      throw new ValidationError(`File type ${file.type} is not allowed`);
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!hasValidMagicBytes(buffer, file.type)) {
      throw new ValidationError('File signature does not match its type');
    }

    const uploaded = await uploadFileToKpiMonthly({
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
      departmentName: report.kpi.department,
      year: report.year,
      month: report.month,
    });

    return this.reportRepo.updateAttachment(reportId, {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      spItemId: uploaded.spItemId,
      spWebUrl: uploaded.spWebUrl,
      spDownloadUrl: uploaded.spDownloadUrl,
      uploadedBy: actor.userId,
      uploadedAt: new Date(),
    });
  }

  async submitReport(reportId: string, actor: ActorContext) {
    const report = await this.getReportById(reportId);
    ensureMonthlyStatusTransition(report.status, 'PENDING_REVIEW');
    const now = new Date();
    return db.$transaction(async (tx) => {
      const updated = await this.reportRepo.updateStatus(reportId, 'PENDING_REVIEW', {
        prepareBy: actor.userId,
        submittedAt: now,
      }, tx);

      await this.approvalSignatureRepo.deleteByDocument('KPI_MONTHLY', reportId, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI_MONTHLY',
        documentId: reportId,
        step: 'PREPARER',
        signerUserId: actor.userId,
        action: 'APPROVED',
        actionDate: now,
      }, tx);
      if (report.kpi.approverUserId) {
        await this.approvalSignatureRepo.upsertStep({
          module: 'KPI_MONTHLY',
          documentId: reportId,
          step: 'APPROVER',
          signerUserId: report.kpi.approverUserId,
          action: 'PENDING',
        }, tx);
      }
      return updated;
    });
  }

  async reviewReport(
    reportId: string,
    actor: ActorContext,
    sigBody?: { signatureDataUrl?: string; signatureType?: SignatureType; saveSignature?: boolean }
  ) {
    if (!['QMS', 'MR', 'IT'].includes(actor.role)) {
      throw new ForbiddenError('Only QMS/MR/IT can review monthly reports');
    }
    const report = await this.getReportById(reportId);
    ensureMonthlyStatusTransition(report.status, 'APPROVED');

    const now = new Date();
    return db.$transaction(async (tx) => {
      const updated = await this.reportRepo.updateStatus(reportId, 'APPROVED', {
        reviewBy: actor.userId,
        approveBy: actor.userId,
        approvedAt: now,
      }, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI_MONTHLY',
        documentId: reportId,
        step: 'REVIEWER',
        signerUserId: actor.userId,
        action: 'APPROVED',
        actionDate: now,
        signaturePath: sigBody?.signatureDataUrl,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        await this.userRepo.saveSignature(actor.userId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType || 'DRAW',
        }, tx);
      }

      return updated;
    });
  }

  async approveReport(
    reportId: string,
    actor: ActorContext,
    sigBody?: { signatureDataUrl?: string; signatureType?: SignatureType; saveSignature?: boolean }
  ) {
    if (!['QMS', 'MR', 'IT'].includes(actor.role)) {
      throw new ForbiddenError('Only QMS/MR/IT can approve monthly reports');
    }
    const report = await this.getReportById(reportId);
    ensureMonthlyStatusTransition(report.status, 'APPROVED');

    const now = new Date();
    return db.$transaction(async (tx) => {
      const updated = await this.reportRepo.updateStatus(reportId, 'APPROVED', {
        approveBy: actor.userId,
        approvedAt: now,
      }, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI_MONTHLY',
        documentId: reportId,
        step: 'APPROVER',
        signerUserId: actor.userId,
        action: 'APPROVED',
        actionDate: now,
        signaturePath: sigBody?.signatureDataUrl,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        await this.userRepo.saveSignature(actor.userId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType || 'DRAW',
        }, tx);
      }

      return updated;
    });
  }

  async rejectReport(reportId: string, reason: string, actor: ActorContext) {
    if (!['QMS', 'MR', 'IT'].includes(actor.role)) {
      throw new ForbiddenError('Only QMS/MR/IT can reject monthly reports');
    }
    const report = await this.getReportById(reportId);
    if (report.status === 'DRAFT' || report.status === 'APPROVED') {
      throw new ConflictError(`Cannot reject a report in ${report.status} status`);
    }
    ensureMonthlyStatusTransition(report.status, 'REJECTED');

    return db.$transaction(async (tx) => {
      const updated = await this.reportRepo.updateStatus(reportId, 'REJECTED', undefined, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI_MONTHLY',
        documentId: reportId,
        step: 'APPROVER',
        signerUserId: actor.userId,
        action: 'REJECTED',
        actionDate: new Date(),
        comment: reason,
      }, tx);
      return updated;
    });
  }

  async addCorrectiveAction(dto: CreateCorrectiveActionDTO) {
    const detail = await this.detailRepo.findById(dto.monthlyDetailId);
    if (!detail) throw new NotFoundError(`Monthly detail ${dto.monthlyDetailId} not found`);
    if (detail.achievedStatus !== 'NOT_OK') {
      throw new ConflictError('Corrective actions are only allowed for NOT_OK results');
    }
    return this.correctiveRepo.createAction(dto);
  }

  async deleteCorrectiveAction(actionId: string) {
    const action = await this.correctiveRepo.findById(actionId);
    if (!action) throw new NotFoundError(`Corrective action ${actionId} not found`);
    return this.correctiveRepo.delete(actionId);
  }

  async listCorrectiveActions(detailId: string) {
    return this.correctiveRepo.listByDetailId(detailId);
  }

  private ensureReportEditableByActor(
    report: Awaited<ReturnType<KpiMonthlyReportRepository['findByIdWithDetails']>>,
    actor: ActorContext,
  ) {
    if (!report) throw new NotFoundError('Monthly report not found');
    if (report.status === 'APPROVED') {
      throw new ConflictError('Cannot edit an approved monthly report');
    }
    if (['QMS', 'MR', 'IT'].includes(actor.role)) return;
    if (report.status !== 'DRAFT' && report.status !== 'REJECTED') {
      throw new ConflictError('Can only edit monthly report in DRAFT or REJECTED status');
    }
  }
}
