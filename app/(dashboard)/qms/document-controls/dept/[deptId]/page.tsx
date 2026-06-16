import { requireAuth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getDepartmentByCode } from '@/lib/departmentCache';
import { CategoryListClient } from '@/components/document-control/CategoryListClient';

export async function generateMetadata({ params }: { params: Promise<{ deptId: string }> }) {
  const { deptId } = await params;
  const dept = await getDepartmentByCode(decodeURIComponent(deptId)); // cache-only in metadata context
  return { title: dept ? `${dept.displayName} — Document Categories` : 'Document Categories' };
}

export default async function DeptCategoryPage({ params }: { params: Promise<{ deptId: string }> }) {
  const session = await requireAuth();
  if (!session) redirect('/');

  const { deptId } = await params;
  const decodedDeptId = decodeURIComponent(deptId);

  const dept = await getDepartmentByCode(decodedDeptId, session.user.accessToken);
  if (!dept) notFound();

  const canManage = ['QMS', 'IT', 'MR'].includes(session.user.role);

  return (
    <div className="px-4 md:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <CategoryListClient department={{ id: dept.code, name: dept.displayName }} canManage={canManage} />
    </div>
  );
}
