import NextAuth from "next-auth";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

async function syncDepartment(userId: string, deptName: string | null | undefined): Promise<string | null> {
  if (!deptName?.trim()) {
    await db.user.update({ where: { id: userId }, data: { departmentId: null } });
    return null;
  }

  const dept = await db.department.upsert({
    where: { name: deptName },
    update: {},
    create: { name: deptName },
    select: { id: true },
  });

  await db.user.update({ where: { id: userId }, data: { departmentId: dept.id } });
  return dept.id;
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

        const dbUser = await db.user.upsert({
          where: { email: user.email },
          update: {
            msUserId,
            name: user.name,
            image: user.image,
            ...(msEmployeeId ? { employeeId: msEmployeeId } : {}),
          },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            msUserId,
            role: "USER",
          },
          select: { id: true, role: true, msUserId: true, employeeId: true, departmentId: true },
        });

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
  },
});

