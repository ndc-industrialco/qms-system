import type { UserRole } from "@/generated/prisma/client";

export type UserWithDept = {
  id: string;
  name: string | null;
  email: string;
  employeeId: string | null;
  role: UserRole;
  msUserId: string | null;
  department: { id: string; name: string } | null;
  createdAt: string;
};

// Lightweight shape used by bulk-push and inline edits
export type UserPatchable = Pick<UserWithDept, "id" | "employeeId" | "msUserId">;

