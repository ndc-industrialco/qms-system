import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { DepartmentRow } from "@/types/department";
import type { UserRole } from "@/generated/prisma/client";

function toRow(d: {
  id: string;
  name: string;
  emailGroup: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { users: number };
}): DepartmentRow {
  return {
    id: d.id,
    name: d.name,
    emailGroup: d.emailGroup,
    isActive: d.isActive,
    _count: { users: d._count.users },
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function getActiveDepartments(): Promise<{ id: string; name: string }[]> {
  return db.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getAllDepartments(): Promise<DepartmentRow[]> {
  const rows = await db.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });
  return rows.map(toRow);
}

export async function createDepartment(data: { name: string; emailGroup?: string | null; isActive?: boolean }): Promise<DepartmentRow> {
  const existing = await db.department.findUnique({ where: { name: data.name }, select: { id: true } });
  if (existing) throw new ValidationError(`แผนก "${data.name}" มีอยู่แล้ว`);

  const dept = await db.department.create({
    data: { name: data.name, emailGroup: data.emailGroup ?? null, isActive: data.isActive ?? true },
    include: { _count: { select: { users: true } } },
  });

  return toRow(dept);
}

export async function updateDepartment(id: string, data: { name?: string; emailGroup?: string | null; isActive?: boolean }): Promise<DepartmentRow> {
  const existing = await db.department.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!existing) throw new NotFoundError("Department");

  if (data.name && data.name !== existing.name) {
    const dup = await db.department.findUnique({ where: { name: data.name }, select: { id: true } });
    if (dup) throw new ValidationError(`แผนก "${data.name}" มีอยู่แล้ว`);
  }

  const updated = await db.department.update({
    where: { id },
    data,
    include: { _count: { select: { users: true } } },
  });

  return toRow(updated);
}

export type DepartmentMember = {
  id: string;
  name: string | null;
  email: string;
  employeeId: string | null;
  role: UserRole;
  msUserId: string | null;
  createdAt: string;
};

export type DepartmentDetail = DepartmentRow & { members: DepartmentMember[] };

export async function getDepartmentWithMembers(id: string): Promise<DepartmentDetail | null> {
  const dept = await db.department.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true } },
      users: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, employeeId: true, role: true, msUserId: true, createdAt: true },
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
  const dept = await db.department.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!dept) throw new NotFoundError("Department");
  if (dept._count.users > 0) throw new ValidationError(`ไม่สามารถลบแผนกที่มีผู้ใช้งาน ${dept._count.users} คน`);

  await db.department.delete({ where: { id } });
}

