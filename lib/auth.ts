import { auth } from "@/lib/auth-node";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { UserRole } from "@/app/generated/prisma/edge";

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
