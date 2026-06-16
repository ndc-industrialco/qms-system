import { DarRepository } from "@/repositories/darRepository";
import { KpiMonthlyReportRepository } from "@/repositories/kpiMonthlyReportRepository";
import { KpiRepository } from "@/repositories/kpiRepository";

type PendingDarItem = {
  darId: string;
  darNo: string | null;
  status: string;
  requestDate: string;
  requesterName: string | null;
  stepRole: string;
};

type PendingKpiItem = {
  id: string;
  kpiId: string;
  department: string;
  month: string | null;
  year: number;
  status: string;
  source: "OBJECTIVE" | "MONTHLY";
};

export type PendingApprovalSummary = {
  totalPending: number;
  pendingDarCount: number;
  pendingKpiReviewCount: number;
  pendingKpiApproveCount: number;
  pendingDarItems: PendingDarItem[];
  pendingKpiReviewItems: PendingKpiItem[];
  pendingKpiApproveItems: PendingKpiItem[];
};

export class ApprovalsService {
  private darRepo = new DarRepository();
  private kpiMonthlyRepo = new KpiMonthlyReportRepository();
  private kpiRepo = new KpiRepository();

  async getPendingSummaryForUser(userId: string, authUserId?: string | null): Promise<PendingApprovalSummary> {
    const [
      pendingDarCount,
      pendingDarItemsRaw,
      pendingKpiMonthlyReviewRaw,
      pendingKpiMonthlyApproveRaw,
      pendingKpiObjectiveReviewRaw,
      pendingKpiObjectiveApproveRaw,
    ] = await Promise.all([
      this.darRepo.countPendingApprovalsByUser(userId, authUserId),
      this.darRepo.findPendingApprovalsByUser(userId, authUserId, 10),
      this.kpiMonthlyRepo.findPendingReviewByUser(userId, 10),
      this.kpiMonthlyRepo.findPendingApproveByUser(userId, 10),
      this.kpiRepo.findPendingReviewByUser(userId, 10),
      this.kpiRepo.findPendingApproveByUser(userId, 10),
    ]);

    const pendingDarItems: PendingDarItem[] = pendingDarItemsRaw.map((row) => ({
      darId: row.darMaster.id,
      darNo: row.darMaster.darNo,
      status: row.darMaster.status,
      requestDate: row.darMaster.requestDate.toISOString(),
      requesterName: row.darMaster.requesterName,
      stepRole: row.stepRole,
    }));

    const monthlyReviewItems: PendingKpiItem[] = pendingKpiMonthlyReviewRaw.map((row) => ({
      id: row.id,
      kpiId: row.kpi.id,
      department: row.kpi.department,
      month: row.month,
      year: row.year,
      status: row.status,
      source: "MONTHLY",
    }));

    const monthlyApproveItems: PendingKpiItem[] = pendingKpiMonthlyApproveRaw.map((row) => ({
      id: row.id,
      kpiId: row.kpi.id,
      department: row.kpi.department,
      month: row.month,
      year: row.year,
      status: row.status,
      source: "MONTHLY",
    }));

    const objectiveReviewItems: PendingKpiItem[] = pendingKpiObjectiveReviewRaw.map((row) => ({
      id: row.id,
      kpiId: row.id,
      department: row.department,
      month: null,
      year: row.yearly,
      status: row.status,
      source: "OBJECTIVE",
    }));

    const objectiveApproveItems: PendingKpiItem[] = pendingKpiObjectiveApproveRaw.map((row) => ({
      id: row.id,
      kpiId: row.id,
      department: row.department,
      month: null,
      year: row.yearly,
      status: row.status,
      source: "OBJECTIVE",
    }));

    const pendingKpiReviewItems = [...objectiveReviewItems, ...monthlyReviewItems];
    const pendingKpiApproveItems = [...objectiveApproveItems, ...monthlyApproveItems];

    const pendingKpiReviewCount = pendingKpiReviewItems.length;
    const pendingKpiApproveCount = pendingKpiApproveItems.length;

    return {
      totalPending: pendingDarCount + pendingKpiReviewCount + pendingKpiApproveCount,
      pendingDarCount,
      pendingKpiReviewCount,
      pendingKpiApproveCount,
      pendingDarItems,
      pendingKpiReviewItems,
      pendingKpiApproveItems,
    };
  }

}
