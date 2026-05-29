import { BaseRepository } from "./baseRepository";
import { User, Prisma, SignatureType } from "@/generated/prisma/client";

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super("user");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user;
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return this.delegate(tx).findUnique({ where: { email } });
  }

  async findAssignees(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { role: { in: ['QMS', 'MR', 'IT'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async findManyWithDept(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        msUserId: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
      },
    });
  }

  async updateProfile(
    id: string,
    data: { name?: string; position?: string | null; savedSignatureUrl?: string | null; signatureType?: SignatureType | null },
    tx?: Prisma.TransactionClient
  ): Promise<User> {
    return this.delegate(tx).update({ where: { id }, data });
  }

  async upsertUser(
    email: string,
    data: Prisma.UserUncheckedCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<User> {
    return this.delegate(tx).upsert({
      where: { email },
      update: {
        name: data.name,
        msUserId: data.msUserId,
        employeeId: data.employeeId,
        departmentId: data.departmentId,
        image: data.image,
      },
      create: data,
    });
  }
}
