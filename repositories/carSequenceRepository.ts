import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export class CarSequenceRepository {
  // Use MAX(sequenceNo)+1 so deleting the last CAR reclaims its number.
  // Must run inside a transaction (createCar always provides one) — the
  // serialisable snapshot prevents two concurrent creates from getting the same seq.
  async nextSequence(year: number, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? db;
    const result = await client.$queryRaw<[{ next: number }]>`
      SELECT COALESCE(MAX("sequenceNo"), 0) + 1 AS next
      FROM "CarMaster"
      WHERE "carYear" = ${year}
    `;
    return Number(result[0].next);
  }

  async previewNext(year: number): Promise<number> {
    const result = await db.$queryRaw<[{ next: number }]>`
      SELECT COALESCE(MAX("sequenceNo"), 0) + 1 AS next
      FROM "CarMaster"
      WHERE "carYear" = ${year}
    `;
    return Number(result[0].next);
  }
}
