import { BaseRepository } from "./baseRepository";
import { Department, Prisma } from "@/generated/prisma/client";

export class DepartmentRepository extends BaseRepository<Department> {
  constructor() {
    super("department");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).department;
  }

  async findByName(name: string, tx?: Prisma.TransactionClient): Promise<Department | null> {
    return this.delegate(tx).findUnique({ where: { name } });
  }

  async findActive(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  async findManyWithCount(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });
  }

  async findByIdWithMembers(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        _count: { select: { users: true } },
        users: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true, employeeId: true, role: true, msUserId: true, createdAt: true },
        },
      },
    });
  }

  async upsertDepartment(name: string, tx?: Prisma.TransactionClient): Promise<Department> {
    return this.delegate(tx).upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}
