import type { Prisma } from "@/generated/prisma/client";
import { DocumentControlRepository } from "@/repositories/documentControlRepository";
import type { DocumentControlExportRow } from "@/types/documentControl";

export class DocumentControlExportService {
  private repo = new DocumentControlRepository();

  async listRows(where: Prisma.DocumentControlWhereInput): Promise<DocumentControlExportRow[]> {
    const rows = await this.repo.findForExport(where);
    const results: DocumentControlExportRow[] = [];

    for (const row of rows) {
      if (!row.revisions || row.revisions.length === 0) {
        results.push({
          id: row.id,
          docNumber: row.docNumber,
          docName: row.docName,
          revision: row.revision,
          status: row.status,
          effectiveDate: row.effectiveDate?.toISOString() ?? null,
          description: row.description ?? null,
          departmentName: row.departmentName ?? null,
          categoryName: row.category?.name ?? null,
          createdByName: row.createdByName ?? null,
          createdAt: row.createdAt.toISOString(),
          requestedByName: row.createdByName ?? null,
          latestRevisionCreatedAt: null,
          latestRevisionCreatedByName: null,
          latestDarNo: null,
          latestDarObjective: null,
          latestDarRequestDate: null,
          distributions: [],
        });
      } else {
        for (const rev of row.revisions) {
          results.push({
            id: `${row.id}-${rev.revision}`,
            docNumber: row.docNumber,
            docName: row.docName,
            revision: rev.revision,
            status: rev.status,
            effectiveDate: rev.effectiveDate?.toISOString() ?? null,
            description: row.description ?? null,
            departmentName: row.departmentName ?? null,
            categoryName: row.category?.name ?? null,
            createdByName: rev.createdByName ?? null,
            createdAt: row.createdAt.toISOString(),
            requestedByName: rev.darMaster?.requesterName ?? rev.createdByName ?? row.createdByName ?? null,
            latestRevisionCreatedAt: rev.createdAt?.toISOString() ?? null,
            latestRevisionCreatedByName: rev.createdByName ?? null,
            latestDarNo: rev.darMaster?.darNo ?? null,
            latestDarObjective: rev.darMaster?.objective ?? null,
            latestDarRequestDate: rev.darMaster?.requestDate?.toISOString() ?? null,
            distributions: rev.darMaster?.distributions.map((d: { departmentName: string | null; authDepartmentId: string | null }) => ({
              departmentName: d.departmentName ?? "",
              authDepartmentId: d.authDepartmentId,
            })) ?? [],
          });
        }
      }
    }

    return results;
  }
}
