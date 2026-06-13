import NextAuth from "next-auth";
import { UserRepository } from "@/repositories/userRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { authConfig } from "@/lib/auth.config";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

/** Refresh the MS Graph delegated access token using the stored refresh_token. */
async function refreshMsAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: number;
  refresh_token?: string;
} | null> {
  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: process.env.AZURE_AD_CLIENT_ID!,
          client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
          scope: "openid profile email offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Send",
        }).toString(),
      }
    );

    if (!res.ok) {
      logger.warn("[auth-node] Token refresh request failed", { status: res.status });
      return null;
    }

    const data = await res.json() as { access_token: string; expires_in: number; refresh_token?: string };
    return {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
      refresh_token: data.refresh_token,
    };
  } catch (err) {
    logger.warn("[auth-node] Token refresh threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

const userRepo = new UserRepository();
const deptRepo = new DepartmentRepository();

async function syncDepartment(userId: string, deptName: string | null | undefined): Promise<string | null> {
  if (!deptName?.trim()) {
    await userRepo.update(userId, { departmentId: null });
    return null;
  }

  const dept = await deptRepo.upsertDepartment(deptName);

  await userRepo.update(userId, { departmentId: dept.id });
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
              { headers: { Authorization: `Bearer ${account.access_token}` } }
            );
            if (res.ok) {
              const data = await res.json() as { department?: string | null; employeeId?: string | null };
              msDepartment = data.department ?? null;
              msEmployeeId = data.employeeId ?? null;
            }
          } catch (err) {
            // Graph unavailable — department/employeeId will be null; synced on next login
            logger.warn("[auth-node] MS Graph /me fetch failed — department sync skipped", {
              userEmail: user.email,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const dbUser = await userRepo.upsertUser(user.email, {
          email: user.email,
          name: user.name,
          image: user.image,
          msUserId,
          employeeId: msEmployeeId ?? undefined,
          role: "USER",
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
        // Unique session ID for blocklist-based force logout
        token.jti = randomUUID();
        return token;
      }

      // Subsequent requests — refresh access token if expired or expiring within 5 minutes.
      const expiresAt = token.accessTokenExpires as number | undefined;
      if (expiresAt && Date.now() > expiresAt - 5 * 60 * 1000 && token.refreshToken) {
        const refreshed = await refreshMsAccessToken(token.refreshToken as string);
        if (refreshed) {
          token.accessToken = refreshed.access_token;
          token.accessTokenExpires = refreshed.expires_at;
          if (refreshed.refresh_token) token.refreshToken = refreshed.refresh_token;
        }
        // If refresh failed, keep the expired token — next request will retry.
      }

      return token;
    },
  },
});
