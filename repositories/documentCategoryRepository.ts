import { BaseRepository } from '@/repositories/baseRepository';
import { DocumentCategory, Prisma } from '@/generated/prisma/client';

export class DocumentCategoryRepository extends BaseRepository<DocumentCategory> {
  constructor() {
    super('documentCategory');
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).documentCategory;
  }

  async listByDepartment(departmentId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { departmentId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { documents: true } } },
    });
  }

  async findByIdWithCount(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { documents: true } },
      },
    });
  }

  async hasDocuments(id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const count = await this.delegate(tx).count({
      where: { id, documents: { some: {} } },
    });
    return count > 0;
  }
}
