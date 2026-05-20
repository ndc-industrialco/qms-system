import NextAuth from "next-auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, departments } from "@/db/schema";
import { authConfig } from "@/lib/auth.config";
import type { UserRole } from "@/db/schema";

async function syncDepartment(userId: string, deptName: string | null | undefined): Promise<string | null> {
  if (!deptName?.trim()) {
    await db.update(users).set({ departmentId: null }).where(eq(users.id, userId));
    return null;
  }

  const existing = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.name, deptName))
    .limit(1);

  let deptId: string;
  if (existing.length > 0) {
    deptId = existing[0].id;
  } else {
    const inserted = await db
      .insert(departments)
      .values({ name: deptName })
      .returning({ id: departments.id });
    deptId = inserted[0].id;
  }

  await db.update(users).set({ departmentId: deptId }).where(eq(users.id, userId));
  return deptId;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "microsoft-entra-id" && user?.email) {
        const msUserId = (profile?.oid ?? profile?.sub) as string | undefined;

        let msDepartment: string | null = null;
        let msEmployeeId: string | null = null;
        if (account.access_token) {
          try {
            const res = await fetch(
              "https://graph.microsoft.com/v1.0/me?$select=id,displayName,givenName,surname,userPrincipalName,mail,businessPhones,jobTitle,officeLocation,preferredLanguage,mobilePhone,employeeId,department,identities,streetAddress,city,state,postalCode,country",
              { headers: { Authorization: `Bearer ${account.access_token}` } },
            );
            if (res.ok) {
              const data = await res.json() as { department?: string | null; employeeId?: string | null };
              msDepartment = data.department ?? null;
              msEmployeeId = data.employeeId ?? null;
            }
          } catch {
            // Graph unavailable — synced on next login
          }
        }

        const existing = await db
          .select({ id: users.id, role: users.role, msUserId: users.msUserId, employeeId: users.employeeId, departmentId: users.departmentId })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        let dbUser: { id: string; role: UserRole; msUserId: string | null; employeeId: string | null; departmentId: string | null };

        if (existing.length > 0) {
          const updated = await db
            .update(users)
            .set({
              msUserId,
              name: user.name,
              image: user.image,
              ...(msEmployeeId ? { employeeId: msEmployeeId } : {}),
            })
            .where(eq(users.email, user.email))
            .returning({ id: users.id, role: users.role, msUserId: users.msUserId, employeeId: users.employeeId, departmentId: users.departmentId });
          dbUser = updated[0];
        } else {
          const inserted = await db
            .insert(users)
            .values({
              email: user.email,
              name: user.name,
              image: user.image,
              msUserId,
              role: "USER",
            })
            .returning({ id: users.id, role: users.role, msUserId: users.msUserId, employeeId: users.employeeId, departmentId: users.departmentId });
          dbUser = inserted[0];
        }

        const departmentId = await syncDepartment(dbUser.id, msDepartment);

        token.id = dbUser.id;
        token.role = dbUser.role;
        token.msUserId = dbUser.msUserId ?? undefined;
        token.m365Verified = true;
        token.employeeId = dbUser.employeeId ?? undefined;
        token.departmentId = departmentId ?? undefined;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.msUserId = token.msUserId as string | undefined;
        session.user.m365Verified = token.m365Verified as boolean | undefined;
        session.user.employeeId = token.employeeId as string | undefined;
        session.user.departmentId = token.departmentId as string | undefined;
        session.user.accessToken = token.accessToken as string | undefined;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      msUserId?: string;
      m365Verified?: boolean;
      employeeId?: string;
      departmentId?: string;
      accessToken?: string;
    };
  }
}
