import { BaseRepository } from "./baseRepository";
import { Announcement, Prisma } from "@/generated/prisma/client";

export class AnnouncementRepository extends BaseRepository<Announcement> {
  constructor() {
    super("announcement");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).announcement;
  }

  async findManyWithCreatedBy(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    });
  }

  async findByIdWithCreatedBy(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: { createdBy: { select: { name: true } } },
    });
  }

  async findManyScrollingOrList(
    where: Prisma.AnnouncementWhereInput,
    take: number,
    tx?: Prisma.TransactionClient
  ) {
    return this.delegate(tx).findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}
