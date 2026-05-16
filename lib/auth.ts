import { auth } from "@/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { UserRole } from "../app/generated/prisma";

export async function getSession() {
  const session = await auth();
  return session;
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
