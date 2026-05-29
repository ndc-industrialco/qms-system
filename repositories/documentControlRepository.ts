import { BaseRepository, type PaginatedResult } from '@/repositories/baseRepository';
import { DocumentControl, Prisma } from '@/generated/prisma/client';

const DOC_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  updatedBy: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, departmentId: true } },
  revisions: {
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.DocumentControlInclude;

type DocumentControlWithRelations = Prisma.DocumentControlGetPayload<{
  include: typeof DOC_INCLUDE;
}>;

export class DocumentControlRepository extends BaseRepository<DocumentControl> {
  constructor() {
    super('documentControl');
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).documentControl;
  }

  async findManyWithUsers(
    params: { page: number; limit: number; sortBy?: string; sortOrder?: string },
    where: Prisma.DocumentControlWhereInput = {},
    tx?: Prisma.TransactionClient,
  ): Promise<PaginatedResult<DocumentControlWithRelations>> {
    const skip = (params.page - 1) * params.limit;
    const order: Record<string, string> = params.sortBy
      ? { [params.sortBy]: params.sortOrder ?? 'desc' }
      : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.delegate(tx).findMany({
        where,
        include: DOC_INCLUDE,
        orderBy: order,
        skip,
        take: params.limit,
      }),
      this.delegate(tx).count({ where }),
    ]);

    return { data, meta: { page: params.page, limit: params.limit, total } };
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient): Promise<DocumentControlWithRelations | null> {
    return this.delegate(tx).findUnique({ where: { id }, include: DOC_INCLUDE });
  }

  async findByDocNumber(docNumber: string, tx?: Prisma.TransactionClient): Promise<DocumentControlWithRelations | null> {
    return this.delegate(tx).findUnique({ where: { docNumber }, include: DOC_INCLUDE });
  }

  /**
   * Rewrite spFolderPath for every revision that belongs to a document.
   * Used when a document is moved to a new department/category.
   */
  async updateRevisionPaths(
    documentControlId: string,
    pathBuilder: (revision: string) => string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = this.getClient(tx);
    const revisions = await client.documentControlRevision.findMany({
      where: { documentControlId },
      select: { id: true, revision: true },
    });
    await Promise.all(
      revisions.map((rev) =>
        client.documentControlRevision.update({
          where: { id: rev.id },
          data: { spFolderPath: pathBuilder(rev.revision) },
        }),
      ),
    );
  }

  /**
   * Mark all existing revisions for a document as OBSOLETE, then create the new
   * revision row — all inside the provided transaction.
   */
  async obsoleteAndCreateRevision(
    documentControlId: string,
    revisionData: Prisma.DocumentControlRevisionUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.documentControlRevision.updateMany({
      where: { documentControlId },
      data: { status: 'OBSOLETE' },
    });
    await tx.documentControlRevision.create({ data: revisionData });
  }

  /**
   * Update spFolderPath for every document in a category, and rewrite revision
   * paths for each of those documents — all inside the provided transaction.
   */
  async updateCategoryDocumentPaths(
    categoryId: string,
    deptName: string,
    newCategoryName: string,
    buildDocPath: (deptName: string, categoryName: string, docNumber: string) => string,
    buildRevPath: (deptName: string, categoryName: string, docNumber: string, revision: string) => string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const docs = await tx.documentControl.findMany({
      where: { categoryId },
      select: { id: true, docNumber: true },
    });

    await Promise.all(
      docs.map(async (doc) => {
        const newDocPath = buildDocPath(deptName, newCategoryName, doc.docNumber);
        await tx.documentControl.update({
          where: { id: doc.id },
          data: { spFolderPath: newDocPath },
        });
        const revisions = await tx.documentControlRevision.findMany({
          where: { documentControlId: doc.id },
          select: { id: true, revision: true },
        });
        await Promise.all(
          revisions.map((rev) =>
            tx.documentControlRevision.update({
              where: { id: rev.id },
              data: { spFolderPath: buildRevPath(deptName, newCategoryName, doc.docNumber, rev.revision) },
            }),
          ),
        );
      }),
    );
  }
}
