import { BaseRepository } from "../baseRepository";
import { AuditSchedule, Prisma } from "@/generated/prisma/client";

export class AuditScheduleRepository extends BaseRepository<AuditSchedule> {
  constructor() {
    super("auditSchedule");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditSchedule;
  }

  async findByPlanId(planId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { planId },
      orderBy: { startAt: "asc" },
    });
  }
}
