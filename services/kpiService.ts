import { ConflictError, ForbiddenError, NotFoundError } from '@/errors/customErrors';
import { db } from '@/lib/db';
import { KpiRepository } from '@/repositories/kpiRepository';
import { KpiObjectiveRepository } from '@/repositories/kpiObjectiveRepository';
import { CreateKpiDTO, UpdateKpiDTO, CreateKpiObjectiveDTO, UpdateKpiObjectiveDTO, ListKpiQuery, SubmitKpiObjectivesDTO } from '@/types/kpi';
import type { ActorContext } from '@/types/kpi';

export class KpiService {
  private kpiRepo = new KpiRepository();
  private objectiveRepo = new KpiObjectiveRepository();

  async listKpis(query: ListKpiQuery) {
    return this.kpiRepo.paginateKpis(query);
  }

  async getKpiById(id: string) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    return kpi;
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

  async submitObjectives(id: string, dto: SubmitKpiObjectivesDTO) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.objectives.length === 0) throw new ConflictError('Cannot submit KPI with no objectives');
    return this.kpiRepo.submitObjectives(id, {
      prepareSignature: dto.prepareSignature,
      reviewerUserId: dto.reviewerUserId,
      approverUserId: dto.approverUserId,
      submittedAt: new Date(),
    });
  }

  async reviewObjectives(id: string, actor: ActorContext) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW') throw new ConflictError('KPI is not pending review');
    if (kpi.reviewerUserId !== actor.userId) throw new ForbiddenError('You are not assigned as reviewer');
    return this.kpiRepo.setStatus(id, 'APPROVED');
  }

  async approveObjectives(id: string, actor: ActorContext) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW') throw new ConflictError('KPI is not pending approval');
    if (kpi.approverUserId !== actor.userId) throw new ForbiddenError('You are not assigned as approver');
    return this.kpiRepo.setStatus(id, 'APPROVED');
  }

  async rejectObjectives(id: string, actor: ActorContext) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW') throw new ConflictError('KPI cannot be rejected in current status');
    if (kpi.reviewerUserId !== actor.userId && kpi.approverUserId !== actor.userId) {
      throw new ForbiddenError('You are not assigned in this KPI workflow');
    }
    return this.kpiRepo.setStatus(id, 'REJECTED');
  }
}
