import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DepartmentService } from "@/services/departmentService";
import DepartmentDetailClient from "@/components/it/DepartmentDetailClient";
import { db } from "@/lib/db";

const deptService = new DepartmentService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const dept = await db.department.findUnique({ where: { id }, select: { name: true } });
  return { title: dept ? `${dept.name} — Department Details` : "Department Details" };
}

export default async function DepartmentDetailPage({ params }: Props) {
  await requireRole("IT");
  const { id } = await params;
  const dept = await deptService.getDepartmentWithMembers(id);
  if (!dept) notFound();

  return <DepartmentDetailClient dept={dept} />;
}
