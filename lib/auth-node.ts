import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { UserRole } from "@/app/generated/prisma/edge";

// Sync the user's department from M365 profile.department on every sign-in.
// If the department name changed in Entra ID, the DB is updated automatically.
async function syncDepartment(userId: string, deptName: string | null | undefined): Promise<string | null> {
  if (!deptName?.trim()) {
    await prisma.user.update({ where: { id: userId }, data: { departmentId: null } });
    return null;
  }

  const dept = await prisma.department.upsert({
    where: { name: deptName },
    update: {},
    create: { name: deptName },
    select: { id: true },
  });

  await prisma.user.update({ where: { id: userId }, data: { departmentId: dept.id } });
  return dept.id;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "microsoft-entra-id" && user?.email) {
        // Entra ID v2.0: object ID is in `oid`; `sub` is a pairwise app-scoped ID
        const msUserId = (profile?.oid ?? profile?.sub) as string | undefined;
        // Fetch department from MS Graph — not included in ID token claims
        let msDepartment: string | null = null;
        let msEmployeeId: string | null = null;
        if (account.access_token) {
          try {
            const res = await fetch(
              "https://graph.microsoft.com/v1.0/me?$select=id,displayName,givenName,surname,userPrincipalName,mail,businessPhones,jobTitle,officeLocation,preferredLanguage,mobilePhone,employeeId,department,identities,streetAddress,city,state,postalCode,country",
              { headers: { Authorization: `Bearer ${account.access_token}` } },
            );
            if (res.ok) {
              const data = await res.json() as { department?: string | null; jobTitle?: string | null; displayName?: string | null; employeeId?: string | null };
              msDepartment = data.department ?? null;
              msEmployeeId = data.employeeId ?? null;
            }
          } catch {
            // Graph unavailable — department stays null, synced on next login
          }
        }

        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          update: { msUserId, name: user.name, image: user.image, ...(msEmployeeId && { employeeId: msEmployeeId }) },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            msUserId,
            role: "USER",
          },
          select: { id: true, role: true, msUserId: true, employeeId: true, departmentId: true },
        });

        // Always sync department — picks up changes made in M365 since last login
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
