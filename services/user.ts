import { db } from "@/lib/db";
import type { UserWithDept } from "@/types/user";
import type { GraphUser } from "@/services/ms-graph";

export async function getAllUsers(): Promise<UserWithDept[]> {
  const rows = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      role: true,
      msUserId: true,
      createdAt: true,
      department: { select: { id: true, name: true } },
    },
  });

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    employeeId: u.employeeId,
    role: u.role,
    msUserId: u.msUserId,
    department: u.department ?? null,
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
        const dept = await db.department.upsert({
          where: { name },
          update: {},
          create: { name },
          select: { id: true },
        });
        deptMap.set(name, dept.id);
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
      const existing = await db.user.findUnique({ where: { email }, select: { id: true } });

      if (existing) {
        await db.user.update({
          where: { email },
          data: { name: entraUser.displayName, msUserId: entraUser.id, employeeId: entraUser.employeeId ?? null, departmentId },
        });
        result.updated++;
      } else {
        await db.user.create({
          data: { email, name: entraUser.displayName, msUserId: entraUser.id, employeeId: entraUser.employeeId ?? null, role: "USER", departmentId },
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
