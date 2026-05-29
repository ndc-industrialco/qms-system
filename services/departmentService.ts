import { DepartmentRepository } from "@/repositories/departmentRepository";
import { NotFoundError, ValidationError } from "@/errors/customErrors";
import type { DepartmentRow, DepartmentDetail } from "@/types/department";
import { redis } from "@/lib/redis";

type DeptRowInput = {
  id: string;
  name: string;
  emailGroup: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { users: number };
};

type DeptWithMembers = NonNullable<Awaited<ReturnType<DepartmentRepository["findByIdWithMembers"]>>>;

export class DepartmentService {
  private deptRepo = new DepartmentRepository();

  /** Redis cache key for active departments list */
  private static readonly ACTIVE_DEPTS_KEY = "qms:departments:active";
  private static readonly ACTIVE_DEPTS_TTL = 300; // 5 minutes

  private toRow(d: DeptRowInput): DepartmentRow {
    return {
      id: d.id,
      name: d.name,
      emailGroup: d.emailGroup,
      isActive: d.isActive,
      _count: { users: d._count?.users ?? 0 },
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }

  async getActiveDepartments(): Promise<{ id: string; name: string }[]> {
    try {
      const cached = await redis.get(DepartmentService.ACTIVE_DEPTS_KEY);
      if (cached) return JSON.parse(cached) as { id: string; name: string }[];
    } catch {
      // Redis unavailable — fall through to DB
    }

    const rows = await this.deptRepo.findActive();

    try {
      await redis.set(
        DepartmentService.ACTIVE_DEPTS_KEY,
        JSON.stringify(rows),
        "EX",
        DepartmentService.ACTIVE_DEPTS_TTL
      );
    } catch {
      // Cache write failure is non-fatal
    }

    return rows;
  }

  private async invalidateActiveCache(): Promise<void> {
    try {
      await redis.del(DepartmentService.ACTIVE_DEPTS_KEY);
    } catch {
      // Non-fatal
    }
  }

  async getAllDepartments(): Promise<DepartmentRow[]> {
    const rows = await this.deptRepo.findManyWithCount();
    return (rows as Array<{
      id: string;
      name: string;
      emailGroup: string | null;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      _count: { users: number };
    }>).map((r) => this.toRow(r));
  }

  async createDepartment(data: { name: string; emailGroup?: string | null; isActive?: boolean }): Promise<DepartmentRow> {
    const existing = await this.deptRepo.findByName(data.name);
    if (existing) throw new ValidationError(`แผนก "${data.name}" มีอยู่แล้ว`);

    const dept = await this.deptRepo.create({
      name: data.name,
      emailGroup: data.emailGroup ?? null,
      isActive: data.isActive ?? true,
    });

    await this.invalidateActiveCache();

    const refetched = await this.deptRepo.findByIdWithMembers(dept.id);
    if (!refetched) throw new NotFoundError("Department");
    return this.toRow(refetched);
  }

  async updateDepartment(id: string, data: { name?: string; emailGroup?: string | null; isActive?: boolean }): Promise<DepartmentRow> {
    const existing = await this.deptRepo.findById(id);
    if (!existing) throw new NotFoundError("Department");

    if (data.name && data.name !== existing.name) {
      const dup = await this.deptRepo.findByName(data.name);
      if (dup) throw new ValidationError(`แผนก "${data.name}" มีอยู่แล้ว`);
    }

    const updated = await this.deptRepo.update(id, data);
    await this.invalidateActiveCache();
    const refetched = await this.deptRepo.findByIdWithMembers(updated.id);
    if (!refetched) throw new NotFoundError("Department");
    return this.toRow(refetched);
  }

  async getDepartmentWithMembers(id: string): Promise<DepartmentDetail | null> {
    const dept = await this.deptRepo.findByIdWithMembers(id);
    if (!dept) return null;

    return {
      ...this.toRow(dept),
      members: dept.users.map((u: DeptWithMembers["users"][number]) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    };
  }

  async deleteDepartment(id: string): Promise<void> {
    const dept = await this.deptRepo.findByIdWithMembers(id);
    if (!dept) throw new NotFoundError("Department");
    if (dept._count.users > 0) throw new ValidationError(`ไม่สามารถลบแผนกที่มีผู้ใช้งาน ${dept._count.users} คน`);

    await this.deptRepo.delete(id);
    await this.invalidateActiveCache();
  }
}
