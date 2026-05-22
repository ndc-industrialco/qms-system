import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { UserRole } from "@/generated/prisma/client";

// Edge-safe NextAuth instance — decodes JWT without any DB access.
// DB callbacks (upsert, syncDepartment) live only in lib/auth-node.ts.
const { auth } = NextAuth(authConfig);

export { auth };

export async function getSession() {
  return auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session;
}

export async function requireRole(...roles: UserRole[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw new ForbiddenError("Insufficient permissions");
  }
  return session;
}
