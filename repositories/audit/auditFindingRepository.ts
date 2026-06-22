import { db } from "@/lib/db";
import { BaseRepository } from "../baseRepository";
import { AuditFinding, FindingStatus, Prisma } from "@/generated/prisma/client";

export class AuditFindingRepository extends BaseRepository<AuditFinding> {
  constructor() {
    super("auditFinding");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditFinding;
  }

  async findByPlanId(planId: string, status?: FindingStatus, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { planId, ...(status ? { status } : {}) },
      include: { correctiveAction: true, verification: true },
      orderBy: { findingNo: "asc" },
    });
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: { correctiveAction: true, verification: true },
    });
  }

  async countByPlanAndStatus(planId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).groupBy({
      by: ["status"],
      where: { planId },
      _count: { status: true },
    });
  }

  /**
   * Atomically increment and return the next finding sequence number for a plan.
   * Uses SystemConfig INSERT ON CONFLICT — same strategy as CarSequenceRepository.
   * Call inside the same transaction as the finding create to ensure atomicity.
   */
  async nextFindingNo(planId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx ?? db;
    const key = `AUDIT_FINDING_SEQ_${planId}`;

    const result = await client.$queryRaw<[{ configValue: string }]>`
      INSERT INTO "SystemConfig" ("configKey", "configValue", "description", "updatedAt")
      VALUES (${key}, '1', ${'Finding sequence for audit plan ' + planId}, NOW())
      ON CONFLICT ("configKey") DO UPDATE
        SET "configValue" = (CAST("SystemConfig"."configValue" AS INTEGER) + 1)::TEXT,
            "updatedAt"   = NOW()
      RETURNING "configValue"
    `;

    return result[0].configValue.padStart(3, "0");
  }

  async updateStatus(id: string, status: FindingStatus, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({ where: { id }, data: { status } });
  }
}
