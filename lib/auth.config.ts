import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile email offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Send",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    // Edge-safe: maps JWT token fields → session.user (no DB access)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role ?? "USER") as UserRole;
        session.user.msUserId = token.msUserId as string | undefined;
        session.user.m365Verified = token.m365Verified as boolean | undefined;
        session.user.employeeId = token.employeeId as string | undefined;
        session.user.departmentId = token.departmentId as string | undefined;
        session.user.accessToken = token.accessToken as string | undefined;
      }
      return session;
    },
  },
};

type UserRole = "USER" | "IT" | "QMS" | "MR";

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
