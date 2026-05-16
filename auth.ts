import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import type { UserRole } from "./app/generated/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "microsoft-entra-id" && user?.email) {
        const msUserId = (profile?.sub ?? profile?.oid) as string | undefined;
        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          update: { msUserId, name: user.name, image: user.image },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            msUserId,
            role: "USER",
          },
          select: { id: true, role: true, msUserId: true, employeeId: true, departmentId: true },
        });
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.msUserId = dbUser.msUserId ?? undefined;
        token.employeeId = dbUser.employeeId ?? undefined;
        token.departmentId = dbUser.departmentId ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.msUserId = token.msUserId as string | undefined;
        session.user.employeeId = token.employeeId as string | undefined;
        session.user.departmentId = token.departmentId as string | undefined;
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
      employeeId?: string;
      departmentId?: string;
    };
  }
}
