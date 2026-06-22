import { BaseRepository, PaginatedResult } from "../baseRepository";
import { AuditPlan, Prisma, AuditPlanStatus, AuditType } from "@/generated/prisma/client";

export interface AuditPlanListQuery {
  page?: number;
  limit?: number;
  auditType?: AuditType;
  status?: AuditPlanStatus;
  departmentId?: string;
  ownerAuthUserId?: string;
  search?: string;
}

export class AuditPlanRepository extends BaseRepository<AuditPlan> {
  constructor() {
    super("auditPlan");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditPlan;
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        departments: true,
        auditors: true,
        schedules: {
          include: { team: { orderBy: { role: "asc" } } },
          orderBy: { startAt: "asc" },
        },
        announcements: { orderBy: { publishedAt: "desc" } },
        findings: { orderBy: { findingNo: "asc" } },
        signoffs: { orderBy: { signedAt: "asc" } },
        report: true,
      },
    });
  }

  async listPaginated(query: AuditPlanListQuery, tx?: Prisma.TransactionClient): Promise<PaginatedResult<AuditPlan>> {
    const where: Prisma.AuditPlanWhereInput = {};

    if (query.auditType) where.auditType = query.auditType;
    if (query.status) where.status = query.status;
    if (query.ownerAuthUserId) where.ownerAuthUserId = query.ownerAuthUserId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { auditNo: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.departmentId) {
      where.departments = { some: { departmentId: query.departmentId } };
    }

    return this.paginate({ page: query.page, limit: query.limit }, where, { createdAt: "desc" }, tx);
  }

  async findByAuditNo(auditNo: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({ where: { auditNo } });
  }

  async updateStatus(id: string, status: AuditPlanStatus, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({ where: { id }, data: { status } });
  }

  async countPendingReviewByUser(authUserId: string) {
    return this.delegate().count({ where: { status: "PENDING_REVIEW", reviewerAuthUserId: authUserId } });
  }

  async countPendingApproveByUser(authUserId: string) {
    return this.delegate().count({ where: { status: "PENDING_APPROVAL", approverAuthUserId: authUserId } });
  }

  async findPendingReviewByUser(authUserId: string, limit = 10) {
    return this.delegate().findMany({
      where: { status: "PENDING_REVIEW", reviewerAuthUserId: authUserId },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }

  async findPendingApproveByUser(authUserId: string, limit = 10) {
    return this.delegate().findMany({
      where: { status: "PENDING_APPROVAL", approverAuthUserId: authUserId },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }
}
