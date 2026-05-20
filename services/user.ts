import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, departments } from "@/db/schema";
import type { UserWithDept } from "@/types/user";
import type { GraphUser } from "@/services/ms-graph";

export async function getAllUsers(): Promise<UserWithDept[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      employeeId: users.employeeId,
      role: users.role,
      msUserId: users.msUserId,
      departmentId: users.departmentId,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const deptIds = [...new Set(rows.map((u) => u.departmentId).filter(Boolean))] as string[];
  const depts = deptIds.length > 0
    ? await db.select({ id: departments.id, name: departments.name }).from(departments).where(inArray(departments.id, deptIds))
    : [];
  const deptMap = Object.fromEntries(depts.map((d) => [d.id, d]));

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    employeeId: u.employeeId,
    role: u.role,
    msUserId: u.msUserId,
    department: u.departmentId ? (deptMap[u.departmentId] ?? null) : null,
    createdAt: u.createdAt.toISOString(),
  }));
}

export interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { email: string; message: string }[];
}

export async function syncEntraUsers(entraUsers: GraphUser[]): Promise<SyncResult> {
  const result: SyncResult = { total: entraUsers.length, created: 0, updated: 0, skipped: 0, errors: [] };

  const deptNames = [...new Set(entraUsers.map((u) => u.department?.trim()).filter(Boolean) as string[])];
  const deptMap = new Map<string, string>();

  if (deptNames.length > 0) {
    await Promise.all(
      deptNames.map(async (name) => {
        const existing = await db.select({ id: departments.id }).from(departments).where(eq(departments.name, name)).limit(1);
        let id: string;
        if (existing.length > 0) {
          id = existing[0].id;
        } else {
          const inserted = await db.insert(departments).values({ name }).returning({ id: departments.id });
          id = inserted[0].id;
        }
        deptMap.set(name, id);
      }),
    );
  }

  for (const entraUser of entraUsers) {
    const email = (entraUser.mail ?? entraUser.userPrincipalName)?.toLowerCase().trim();

    if (!email) {
      result.skipped++;
      result.errors.push({ email: entraUser.userPrincipalName, message: "No email address" });
      continue;
    }

    const departmentId = entraUser.department?.trim() ? (deptMap.get(entraUser.department.trim()) ?? null) : null;

    try {
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

      if (existing.length > 0) {
        await db.update(users).set({
          name: entraUser.displayName,
          msUserId: entraUser.id,
          employeeId: entraUser.employeeId ?? null,
          departmentId,
        }).where(eq(users.email, email));
        result.updated++;
      } else {
        await db.insert(users).values({
          email,
          name: entraUser.displayName,
          msUserId: entraUser.id,
          employeeId: entraUser.employeeId ?? null,
          role: "USER",
          departmentId,
        });
        result.created++;
      }
    } catch (err) {
      result.skipped++;
      result.errors.push({ email, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return result;
}
