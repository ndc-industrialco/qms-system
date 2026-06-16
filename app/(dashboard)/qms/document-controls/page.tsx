import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getDepartments } from '@/lib/departmentCache';
import { DocumentControlsLevelOneClient } from '@/components/document-control/DocumentControlsLevelOneClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Document Control",
};

export default async function DocumentControlsPage() {
  const session = await requireAuth();
  if (!session) redirect('/');

  const canManage = ['QMS', 'IT', 'MR'].includes(session.user.role);

  const rawDepts = await getDepartments(session.user.accessToken);
  const departments = rawDepts.map((d) => ({
    authDepartmentId: d.code,
    name: d.displayName,
    emailGroup: d.emailGroup ?? null,
    isActive: true,
  }));

  const departmentIds = departments.map((dept) => dept.authDepartmentId);
  const categories = await db.documentCategory.findMany({
    where: { departmentId: { in: departmentIds } },
    include: { _count: { select: { documents: true } } },
    orderBy: [{ departmentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
  });

  const categoriesByDepartment = new Map<string, typeof categories>();
  for (const category of categories) {
    const existing = categoriesByDepartment.get(category.departmentId) ?? [];
    existing.push(category);
    categoriesByDepartment.set(category.departmentId, existing);
  }

  const deptCards = departments.map((dept) => {
    const deptCategories = categoriesByDepartment.get(dept.authDepartmentId) ?? [];
    const activeDocCount = deptCategories.reduce((sum, cat) => sum + cat._count.documents, 0);

    return {
      id: dept.authDepartmentId,
      name: dept.name,
      emailGroup: dept.emailGroup,
      isActive: dept.isActive,
      categoryCount: deptCategories.length,
      documentCount: activeDocCount,
    };
  });

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      <DocumentControlsLevelOneClient departments={deptCards} canManage={canManage} />
    </div>
  );
}
