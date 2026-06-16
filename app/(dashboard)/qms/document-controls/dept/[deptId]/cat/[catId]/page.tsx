import { requireAuth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getDepartmentByCode } from '@/lib/departmentCache';
import { DocumentControlListClient } from '@/components/document-control/DocumentControlListClient';

export async function generateMetadata({ params }: { params: Promise<{ deptId: string; catId: string }> }) {
  const { catId } = await params; // catId is a UUID — no decode needed
  const cat = await db.documentCategory.findUnique({ where: { id: catId }, select: { name: true } });
  return { title: cat ? `${cat.name} — Documents` : 'Documents' };
}

export default async function CategoryDocumentPage({ params }: { params: Promise<{ deptId: string; catId: string }> }) {
  const session = await requireAuth();
  if (!session) redirect('/');

  const { deptId, catId } = await params;
  const decodedDeptId = decodeURIComponent(deptId);

  const [dept, category] = await Promise.all([
    getDepartmentByCode(decodedDeptId, session.user.accessToken),
    db.documentCategory.findUnique({ where: { id: catId }, select: { id: true, name: true, departmentId: true } }),
  ]);

  if (!dept || !category || category.departmentId !== decodedDeptId) notFound();

  const canManage = ['QMS', 'IT', 'MR'].includes(session.user.role);

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <DocumentControlListClient
        department={{ id: dept.code, name: dept.displayName }}
        category={category}
        canCreate={canManage}
      />
    </div>
  );
}
