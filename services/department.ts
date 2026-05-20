import { prisma } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { DepartmentRow } from "@/types/department";

function toRow(d: {
  id: string;
  name: string;
  emailGroup: string | null;
  isActive: boolean;
  _count: { users: number };
  createdAt: Date;
  updatedAt: Date;
}): DepartmentRow {
  return { ...d, createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString() };
}

const SELECT = {
  id: true,
  name: true,
  emailGroup: true,
  isActive: true,
  _count: { select: { users: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export async function getActiveDepartments(): Promise<{ id: string; name: string }[]> {
  return prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getAllDepartments(): Promise<DepartmentRow[]> {
  const rows = await prisma.department.findMany({
    select: SELECT,
    orderBy: { name: "asc" },
  });
  return rows.map(toRow);
}

export async function createDepartment(data: {
  name: string;
  emailGroup?: string | null;
  isActive?: boolean;
}): Promise<DepartmentRow> {
  const existing = await prisma.department.findUnique({ where: { name: data.name } });
  if (existing) throw new ValidationError(`แผนก "${data.name}" มีอยู่แล้ว`);

  const dept = await prisma.department.create({
    data: {
      name: data.name,
      emailGroup: data.emailGroup ?? null,
      isActive: data.isActive ?? true,
    },
    select: SELECT,
  });
  return toRow(dept);
}

export async function updateDepartment(
  id: string,
  data: { name?: string; emailGroup?: string | null; isActive?: boolean },
): Promise<DepartmentRow> {
  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Department");

  if (data.name && data.name !== existing.name) {
    const dup = await prisma.department.findUnique({ where: { name: data.name } });
    if (dup) throw new ValidationError(`แผนก "${data.name}" มีอยู่แล้ว`);
  }

  const dept = await prisma.department.update({
    where: { id },
    data,
    select: SELECT,
  });
  return toRow(dept);
}

export type DepartmentMember = {
  id: string;
  name: string | null;
  email: string;
  employeeId: string | null;
  role: import("@/app/generated/prisma/edge").UserRole;
  msUserId: string | null;
  createdAt: string;
};

export type DepartmentDetail = DepartmentRow & {
  members: DepartmentMember[];
};

export async function getDepartmentWithMembers(id: string): Promise<DepartmentDetail | null> {
  const dept = await prisma.department.findUnique({
    where: { id },
    select: {
      ...SELECT,
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true,
          role: true,
          msUserId: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!dept) return null;

  return {
    ...toRow(dept),
    members: dept.users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
  };
}

export async function deleteDepartment(id: string): Promise<void> {
  const existing = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!existing) throw new NotFoundError("Department");
  if (existing._count.users > 0)
    throw new ValidationError(`ไม่สามารถลบแผนกที่มีผู้ใช้งาน ${existing._count.users} คน`);

  await prisma.department.delete({ where: { id } });
}
