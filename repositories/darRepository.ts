import { BaseRepository } from "./baseRepository";
import { DarMaster, Prisma } from "@/generated/prisma/client";

export class DarRepository extends BaseRepository<DarMaster> {
  constructor() {
    super("darMaster");
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient) {
    return this.getModel(tx).findUnique({
      where: { id },
      include: {
        requester: { include: { department: true } },
        items: { orderBy: { itemNo: "asc" } },
        distributions: { include: { department: true } },
        approvals: {
          orderBy: { id: "asc" },
          include: { assignedUser: { include: { department: true } } },
        },
        attachments: {
          orderBy: { createdAt: "asc" },
          include: { uploadedBy: true },
        },
      },
    });
  }

  async findManySummary(take = 200, tx?: Prisma.TransactionClient) {
    return this.getModel(tx).findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: { _count: { select: { items: true } } },
    });
  }

  async findManyByRequester(
    requesterId: string,
    skip: number,
    take: number,
    tx?: Prisma.TransactionClient
  ) {
    return this.getModel(tx).findMany({
      where: { requesterId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { _count: { select: { items: true } } },
    });
  }

  async countByRequester(requesterId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.getModel(tx).count({
      where: { requesterId },
    });
  }

  // --- DarItem Operations ---
  async deleteItemsByDarId(darMasterId: string, tx: Prisma.TransactionClient) {
    return tx.darItem.deleteMany({
      where: { darMasterId },
    });
  }

  async createItems(items: Prisma.DarItemCreateManyInput[], tx: Prisma.TransactionClient) {
    return tx.darItem.createMany({
      data: items,
    });
  }

  // --- DarDistribution Operations ---
  async deleteDistributionsByDarId(darMasterId: string, tx: Prisma.TransactionClient) {
    return tx.darDistribution.deleteMany({
      where: { darMasterId },
    });
  }

  async createDistributions(
    distributions: Prisma.DarDistributionCreateManyInput[],
    tx: Prisma.TransactionClient
  ) {
    return tx.darDistribution.createMany({
      data: distributions,
    });
  }

  // --- DarApproval Operations ---
  async findApprovalsByDarId(darMasterId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.getClient();
    return client.darApproval.findMany({
      where: { darMasterId },
      orderBy: { id: "asc" },
      select: { id: true, stepRole: true, action: true, assignedUserId: true },
    });
  }

  async findPendingApproval(darMasterId: string, userId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.getClient();
    return client.darApproval.findFirst({
      where: { darMasterId, assignedUserId: userId, action: "PENDING" },
    });
  }

  async createApproval(data: Prisma.DarApprovalUncheckedCreateInput, tx: Prisma.TransactionClient) {
    return tx.darApproval.create({ data });
  }

  async updateApproval(id: string, data: Prisma.DarApprovalUpdateInput, tx: Prisma.TransactionClient) {
    return tx.darApproval.update({
      where: { id },
      data,
    });
  }

  async deleteApprovalsByDarId(darMasterId: string, tx: Prisma.TransactionClient) {
    return tx.darApproval.deleteMany({
      where: { darMasterId },
    });
  }

  async deleteApprovalsByDarIdExceptPreparer(darMasterId: string, tx: Prisma.TransactionClient) {
    return tx.darApproval.deleteMany({
      where: {
        darMasterId,
        stepRole: {
          not: "PREPARER",
        },
      },
    });
  }

  // --- DarAttachment Operations ---
  async findAttachmentsByDarId(darMasterId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.getClient();
    return client.darAttachment.findMany({
      where: { darMasterId },
      select: { spItemId: true },
    });
  }

  async createAttachments(
    attachments: Prisma.DarAttachmentCreateManyInput[],
    tx: Prisma.TransactionClient
  ) {
    return tx.darAttachment.createMany({
      data: attachments,
    });
  }

  async deleteAttachmentsByDarId(darMasterId: string, tx: Prisma.TransactionClient) {
    return tx.darAttachment.deleteMany({
      where: { darMasterId },
    });
  }
}
