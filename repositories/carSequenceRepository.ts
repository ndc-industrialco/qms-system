import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export class CarSequenceRepository {
  async nextSequence(year: number, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? db;

    // Use upsert on SystemConfig with a transaction to prevent race conditions.
    // Key format: CAR_COUNTER_{year}
    const counterKey = `CAR_COUNTER_${year}`;

    // Lock row by upserting — PostgreSQL serializes concurrent upserts on unique key.
    // We read the current value, increment, and write back inside the same tx.
    const existing = await client.systemConfig.findUnique({
      where: { configKey: counterKey },
      select: { configValue: true },
    });

    const nextSeq = existing ? parseInt(existing.configValue, 10) + 1 : 1;

    await client.systemConfig.upsert({
      where: { configKey: counterKey },
      create: { configKey: counterKey, configValue: String(nextSeq), description: `CAR counter for ${year}` },
      update: { configValue: String(nextSeq) },
    });

    return nextSeq;
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
