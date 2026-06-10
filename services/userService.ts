import { UserRepository } from "@/repositories/userRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { pushUserToEntra } from "@/services/ms-graph";
import { AuditService } from "@/services/auditService";
import type { UserWithDept } from "@/types/user";
import type { GraphUser } from "@/services/ms-graph";
import { Prisma, type UserRole } from "@/generated/prisma/client";

export class UserService {
  private userRepo = new UserRepository();
  private deptRepo = new DepartmentRepository();

  async getAllUsers(): Promise<UserWithDept[]> {
    const rows = await this.userRepo.findManyWithDept();
    return (rows as Array<{
      id: string;
      name: string | null;
      email: string;
      employeeId: string | null;
      role: UserRole;
      msUserId: string | null;
      department: { id: string; name: string } | null;
      createdAt: Date;
    }>).map((u) => ({
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

  async syncEntraUsers(entraUsers: GraphUser[], actorUserId?: string) {
    const result = {
      total: entraUsers.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { email: string; message: string }[]
    };

    const deptNames = [...new Set(entraUsers.map((u) => u.department?.trim()).filter(Boolean) as string[])];
    const deptMap = new Map<string, string>();

    if (deptNames.length > 0) {
      await Promise.all(
        deptNames.map(async (name) => {
          const dept = await this.deptRepo.upsertDepartment(name);
          deptMap.set(name, dept.id);
        })
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
        const existing = await this.userRepo.findByEmail(email);

        if (existing) {
          await this.userRepo.update(existing.id, {
            name: entraUser.displayName,
            msUserId: entraUser.id,
            employeeId: entraUser.employeeId ?? null,
            departmentId,
          });
          result.updated++;
        } else {
          await this.userRepo.create({
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

    if (actorUserId) {
      await AuditService.record({
        actorUserId,
        actorRole: "IT",
        action: "SYNC",
        resourceType: "USER",
        resourceId: "M365_SYNC",
        after: { created: result.created, updated: result.updated, skipped: result.skipped },
      });
    }

    return result;
  }

  async verifyUserExists(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError("ไม่พบผู้ใช้");
  }

  async updateUserAttributes(
    id: string,
    data: { role?: UserRole; departmentId?: string | null; employeeId?: string | null }
  ): Promise<{ id: string; role: string }> {
    const existing = await this.userRepo.findById(id);
    if (!existing) throw new NotFoundError("ไม่พบผู้ใช้");

    if (Object.keys(data).length === 0) throw new ValidationError("Nothing to update");

    const updateData: Prisma.UserUpdateInput = {
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.departmentId !== undefined
        ? { department: data.departmentId ? { connect: { id: data.departmentId } } : { disconnect: true } }
        : {}),
      ...(data.employeeId !== undefined ? { employeeId: data.employeeId } : {}),
    };

    const updated = await this.userRepo.updateAttributes(id, updateData);
    return { id: updated.id, role: updated.role };
  }

  async pushUserToM365(id: string): Promise<void> {
    const user = await this.userRepo.findForM365Push(id);
    if (!user) throw new NotFoundError("ไม่พบผู้ใช้");
    if (!user.msUserId) throw new ValidationError("ผู้ใช้นี้ยังไม่เชื่อมกับ Microsoft 365");

    await pushUserToEntra(user.msUserId, {
      displayName: user.name ?? undefined,
      department: user.department?.name ?? null,
      employeeId: user.employeeId ?? null,
    });
  }

  async findByMsUserIds(msUserIds: string[]) {
    return this.userRepo.findByMsUserIds(msUserIds);
  }
}
