import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export class DepartmentCodeRepository {
  private delegate(tx?: Prisma.TransactionClient) {
    return (tx ?? db).departmentCode;
  }

  findAll(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({ orderBy: { departmentName: "asc" } });
  }

  findByAuthDeptId(authDeptId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({ where: { authDeptId } });
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({ where: { id } });
  }

  async upsert(data: { authDeptId: string; departmentName: string; code: string }, tx?: Prisma.TransactionClient) {
    const client = this.delegate(tx);

    // Use a try/catch pattern instead of Prisma's upsert to avoid race conditions.
    // Prisma upsert is not atomic when there are multiple @unique fields — concurrent
    // requests can both "decide to create" before either commits, causing a unique
    // constraint violation on `code` even though `authDeptId` was the lookup key.
    try {
      return await client.create({ data });
    } catch (err) {
      // P2002 = Unique constraint violation — record already exists (race condition or normal update)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Find by authDeptId first, fall back to code (handles both unique fields)
        const existing = await client.findFirst({
          where: { OR: [{ authDeptId: data.authDeptId }, { code: data.code }] },
        });
        if (existing) {
          return await client.update({
            where: { id: existing.id },
            data: { departmentName: data.departmentName, code: data.code, authDeptId: data.authDeptId },
          });
        }
      }
      throw err;
    }
  }

  delete(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).delete({ where: { id } });
  }
}
