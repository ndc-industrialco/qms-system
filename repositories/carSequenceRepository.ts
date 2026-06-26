import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export class CarSequenceRepository {
  // Find the lowest sequence number not already in use for this year (gap-fill).
  // Must run inside a transaction to prevent races between concurrent creates.
  async nextSequence(year: number, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? db;
    const existing = await client.$queryRaw<{ seq: number }[]>`
      SELECT "sequenceNo" AS seq
      FROM "CarMaster"
      WHERE "carYear" = ${year}
      ORDER BY "sequenceNo"
    `;
    const used = new Set(existing.map((r) => Number(r.seq)));
    let next = 1;
    while (used.has(next)) next++;
    return next;
  }

  async previewNext(year: number): Promise<number> {
    const existing = await db.$queryRaw<{ seq: number }[]>`
      SELECT "sequenceNo" AS seq
      FROM "CarMaster"
      WHERE "carYear" = ${year}
      ORDER BY "sequenceNo"
    `;
    const used = new Set(existing.map((r) => Number(r.seq)));
    let next = 1;
    while (used.has(next)) next++;
    return next;
  }
}
