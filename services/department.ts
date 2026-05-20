import { eq, asc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, users } from "@/db/schema";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { DepartmentRow } from "@/types/department";
import type { UserRole } from "@/db/schema";

function toRow(d: {
  id: string;
  name: string;
  emailGroup: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}): DepartmentRow {
  return {
    id: d.id,
    name: d.name,
    emailGroup: d.emailGroup,
    isActive: d.isActive,
    _count: { users: d.userCount },
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

async function withUserCount(rows: { id: string; name: string; emailGroup: string | null; isActive: boolean; createdAt: Date; updatedAt: Date }[]): Promise<DepartmentRow[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const counts = await db
    .select({ departmentId: users.departmentId, cnt: count().as("cnt") })
    .from(users)
    .where(eq(users.departmentId, ids[0]))
    .groupBy(users.departmentId);

  const countMap = Object.fromEntries(counts.map((c) => [c.departmentId!, Number(c.cnt)]));
  return rows.map((r) => toRow({ ...r, userCount: countMap[r.id] ?? 0 }));
}

export async function getActiveDepartments(): Promise<{ id: string; name: string }[]> {
  return db.select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(eq(departments.isActive, true))
    .orderBy(asc(departments.name));
}

export async function getAllDepartments(): Promise<DepartmentRow[]> {
  const userCounts = db
    .select({ departmentId: users.departmentId, cnt: count().as("cnt") })
    .from(users)
    .groupBy(users.departmentId)
    .as("userCounts");

  const rows = await db
    .select({
      id: departments.id,
      name: departments.name,
      emailGroup: departments.emailGroup,
      isActive: departments.isActive,
      createdAt: departments.createdAt,
      updatedAt: departments.updatedAt,
      userCount: userCounts.cnt,
    })
    .from(departments)
    .leftJoin(userCounts, eq(departments.id, userCounts.departmentId))
    .orderBy(asc(departments.name));

  return rows.map((r) => toRow({ ...r, userCount: Number(r.userCount ?? 0) }));
}

export async function createDepartment(data: { name: string; emailGroup?: string | null; isActive?: boolean }): Promise<DepartmentRow> {
  const existing = await db.select({ id: departments.id }).from(departments).where(eq(departments.name, data.name)).limit(1);
  if (existing.length > 0) throw new ValidationError(`แผนก "${data.name}" มีอยู่แล้ว`);

  const [dept] = await db.insert(departments).values({
    name: data.name,
    emailGroup: data.emailGroup ?? null,
    isActive: data.isActive ?? true,
  }).returning();

  return toRow({ ...dept, userCount: 0 });
}

export async function updateDepartment(id: string, data: { name?: string; emailGroup?: string | null; isActive?: boolean }): Promise<DepartmentRow> {
  const [existing] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  if (!existing) throw new NotFoundError("Department");

  if (data.name && data.name !== existing.name) {
    const dup = await db.select({ id: departments.id }).from(departments).where(eq(departments.name, data.name)).limit(1);
    if (dup.length > 0) throw new ValidationError(`แผนก "${data.name}" มีอยู่แล้ว`);
  }

  const [updated] = await db.update(departments).set(data).where(eq(departments.id, id)).returning();

  const [{ userCount }] = await db.select({ userCount: count() }).from(users).where(eq(users.departmentId, id));
  return toRow({ ...updated, userCount: Number(userCount) });
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
  const [dept] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  if (!dept) return null;

  const members = await db
    .select({ id: users.id, name: users.name, email: users.email, employeeId: users.employeeId, role: users.role, msUserId: users.msUserId, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.departmentId, id))
    .orderBy(asc(users.name));

  const [{ userCount }] = await db.select({ userCount: count() }).from(users).where(eq(users.departmentId, id));

  return {
    ...toRow({ ...dept, userCount: Number(userCount) }),
    members: members.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
  };
}

export async function deleteDepartment(id: string): Promise<void> {
  const [existing] = await db.select({ id: departments.id }).from(departments).where(eq(departments.id, id)).limit(1);
  if (!existing) throw new NotFoundError("Department");

  const [{ userCount }] = await db.select({ userCount: count() }).from(users).where(eq(users.departmentId, id));
  if (Number(userCount) > 0) throw new ValidationError(`ไม่สามารถลบแผนกที่มีผู้ใช้งาน ${userCount} คน`);

  await db.delete(departments).where(eq(departments.id, id));
}
