import { listAuthCenterUsers } from "@/lib/auth-center-admin-client";
import type { UserWithDept } from "@/types/user";
import type { UserRole } from "@/generated/prisma/client";
import { pickHighestQmsRole } from "@/lib/qms-roles";

export class UserService {
  /**
   * Return all users from Auth Center.
   * No local User table — identity comes entirely from Auth Center.
   */
  async getAllUsers(accessToken?: string | null): Promise<UserWithDept[]> {
    const authUsers = await listAuthCenterUsers({ accessToken });
    return authUsers
      .filter((u) => u.id)
      .map((u) => ({
        id: u.id,
        authUserId: u.id,
        name: u.displayName ?? null,
        email: u.email ?? null,
        employeeId: u.employeeId ?? null,
        position: u.jobTitle ?? null,
        role: pickHighestQmsRole(u.roles) as UserRole,
        msUserId: null,
        department: u.department
          ? { id: u.department, name: u.department, authDepartmentId: u.department }
          : null,
        createdAt: new Date().toISOString(),
      }));
  }

  /**
   * Verify a user exists — now a no-op since identity is Auth Center's responsibility.
   * Kept for API compatibility (block-session route calls it).
   */
  async verifyUserExists(_id: string): Promise<void> {
    // Auth Center is authoritative — we cannot verify locally.
    // Callers should use Auth Center APIs if verification is needed.
  }

  /**
   * Update local user attributes — no-op now that the User table is removed.
   * Identity fields should be updated through Auth Center.
   */
  async updateUserAttributes(
    _id: string,
    _data: { departmentId?: string | null; employeeId?: string | null },
  ): Promise<{ id: string; role: string }> {
    // No local User table — return a placeholder.
    // Attribute updates should go through Auth Center M2M APIs.
    return { id: _id, role: "USER" };
  }

  /**
   * Push user to M365 — no longer possible without local User table.
   * This should be handled by Auth Center directly.
   */
  async pushUserToM365(_id: string): Promise<void> {
    throw new Error("M365 push is now handled by Auth Center. Local User table has been removed.");
  }
}
