import { BaseRepository } from "./baseRepository";
import { User, Prisma, SignatureType } from "@/generated/prisma/client";

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super("user");
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient): Promise<User | null> {
    return this.getModel(tx).findUnique({
      where: { email },
    });
  }

  async findManyWithDept(tx?: Prisma.TransactionClient) {
    return this.getModel(tx).findMany({
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
    return this.getModel(tx).update({
      where: { id },
      data,
    });
  }

  async upsertUser(
    email: string,
    data: Prisma.UserUncheckedCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<User> {
    return this.getModel(tx).upsert({
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
