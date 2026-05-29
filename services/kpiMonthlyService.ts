import { ConflictError, ForbiddenError, NotFoundError } from '@/errors/customErrors';
import { db } from '@/lib/db';
import { ensureMonthlyStatusTransition } from '@/lib/kpi-state-machine';
import { KpiMonthlyReportRepository } from '@/repositories/kpiMonthlyReportRepository';
import { KpiMonthlyDetailRepository } from '@/repositories/kpiMonthlyDetailRepository';
import { KpiCorrectiveActionRepository } from '@/repositories/kpiCorrectiveActionRepository';
import { KpiObjectiveRepository } from '@/repositories/kpiObjectiveRepository';
import { ActorContext, CreateMonthlyReportDTO, CreateCorrectiveActionDTO, ListMonthlyQuery, UpdateMonthlyDetailDTO } from '@/types/kpi';

export class KpiMonthlyService {
  private reportRepo = new KpiMonthlyReportRepository();
  private detailRepo = new KpiMonthlyDetailRepository();
  private correctiveRepo = new KpiCorrectiveActionRepository();
  private objectiveRepo = new KpiObjectiveRepository();

  async createMonthlyReport(dto: CreateMonthlyReportDTO, actor: ActorContext) {
    const existing = await db.kPIMonthlyReport.findUnique({
      where: { kpiId_month_year: { kpiId: dto.kpiId, month: dto.month, year: dto.year } },
    });
    if (existing) throw new ConflictError(`Monthly report for ${dto.month} ${dto.year} already exists`);

    const objectives = await this.objectiveRepo.findByKpiId(dto.kpiId);

    return db.$transaction(async (tx) => {
      const report = await db.kPIMonthlyReport.create({
        data: { kpiId: dto.kpiId, month: dto.month, year: dto.year },
      });

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

  async updateDetail(detailId: string, dto: UpdateMonthlyDetailDTO, actor: ActorContext) {
    const detail = await db.kPIMonthlyDetail.findUnique({
      where: { id: detailId },
      include: { monthlyReport: true, kpiObjective: true },
    });
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

  async submitReport(reportId: string, actor: ActorContext) {
    const report = await this.getReportById(reportId);
    ensureMonthlyStatusTransition(report.status, 'PENDING_REVIEW');

    return this.reportRepo.updateStatus(reportId, 'PENDING_REVIEW', {
      prepareBy: actor.userId,
      submittedAt: new Date(),
    });
  }

  async reviewReport(reportId: string, actor: ActorContext) {
    if (!['QMS', 'MR', 'IT'].includes(actor.role)) {
      throw new ForbiddenError('Only QMS/MR/IT can review monthly reports');
    }
    const report = await this.getReportById(reportId);
    ensureMonthlyStatusTransition(report.status, 'PENDING_APPROVAL');

    return this.reportRepo.updateStatus(reportId, 'PENDING_APPROVAL', { reviewBy: actor.userId });
  }

  async approveReport(reportId: string, actor: ActorContext) {
    if (!['QMS', 'MR', 'IT'].includes(actor.role)) {
      throw new ForbiddenError('Only QMS/MR/IT can approve monthly reports');
    }
    const report = await this.getReportById(reportId);
    ensureMonthlyStatusTransition(report.status, 'APPROVED');

    return this.reportRepo.updateStatus(reportId, 'APPROVED', {
      approveBy: actor.userId,
      approvedAt: new Date(),
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

    return this.reportRepo.updateStatus(reportId, 'REJECTED');
  }

  async addCorrectiveAction(dto: CreateCorrectiveActionDTO, actor: ActorContext) {
    const detail = await db.kPIMonthlyDetail.findUnique({ where: { id: dto.monthlyDetailId } });
    if (!detail) throw new NotFoundError(`Monthly detail ${dto.monthlyDetailId} not found`);
    if (detail.achievedStatus !== 'NOT_OK') {
      throw new ConflictError('Corrective actions are only allowed for NOT_OK results');
    }
    return this.correctiveRepo.createAction(dto);
  }

  async deleteCorrectiveAction(actionId: string, actor: ActorContext) {
    const action = await this.correctiveRepo.findById(actionId);
    if (!action) throw new NotFoundError(`Corrective action ${actionId} not found`);
    return this.correctiveRepo.delete(actionId);
  }

  async listCorrectiveActions(detailId: string) {
    return this.correctiveRepo.listByDetailId(detailId);
  }
}
