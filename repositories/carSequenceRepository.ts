import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export class CarSequenceRepository {
  async nextSequence(year: number, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? db;

    const counterKey = `CAR_COUNTER_${year}`;
    const description = `CAR counter for ${year}`;

    // Atomic: INSERT ... ON CONFLICT DO UPDATE increments the counter in a single
    // statement — no separate read-then-write gap for concurrent requests to race through.
    const result = await client.$queryRaw<[{ configValue: string }]>`
      INSERT INTO "SystemConfig" ("configKey", "configValue", "description", "updatedAt")
      VALUES (${counterKey}, '1', ${description}, NOW())
      ON CONFLICT ("configKey") DO UPDATE
        SET "configValue" = (CAST("SystemConfig"."configValue" AS INTEGER) + 1)::TEXT,
            "updatedAt"   = NOW()
      RETURNING "configValue"
    `;

    return parseInt(result[0].configValue, 10);
  }

  async previewNext(year: number): Promise<number> {
    const counterKey = `CAR_COUNTER_${year}`;
    const existing = await db.systemConfig.findUnique({
      where: { configKey: counterKey },
      select: { configValue: true },
    });
    return existing ? parseInt(existing.configValue, 10) + 1 : 1;
  }
}
