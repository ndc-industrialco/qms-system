import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { DocumentControlsLevelOneClient } from '@/components/document-control/DocumentControlsLevelOneClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Document Control",
};

export default async function DocumentControlsPage() {
  const session = await requireAuth();
  if (!session) redirect('/');

  const canManage = ['QMS', 'IT', 'MR'].includes(session.user.role);

  const departments = await db.department.findMany({
    where: canManage ? undefined : { isActive: true },
    include: {
      docCategories: {
        include: { _count: { select: { documents: true } } },
      },
      _count: { select: { docControls: true } },
    },
    orderBy: { name: 'asc' },
  });


  const deptCards = departments.map((dept) => {
    // Sum documents of all categories to exclude orphaned documents (without a category)
    const activeDocCount = dept.docCategories.reduce((sum, cat) => sum + cat._count.documents, 0);

    return {
      id: dept.id,
      name: dept.name,
      emailGroup: dept.emailGroup,
      isActive: dept.isActive,
      categoryCount: dept.docCategories.length,
      documentCount: activeDocCount,
    };
  });

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
      <DocumentControlsLevelOneClient departments={deptCards} canManage={canManage} />
    </div>
  );
}
