import { auth } from "@/lib/auth";
import KpiObjectivesClient from "@/components/kpi/KpiObjectivesClient";
import { UserRepository } from "@/repositories/userRepository";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "KPI" };

const userRepo = new UserRepository();

export default async function KpiObjectivesPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";
  const role = (session?.user?.role ?? "USER") as "USER" | "IT" | "QMS" | "MR";

  // Always fetch departmentId fresh from DB — JWT token can be stale
  // after a dept is assigned without re-login
  let userDepartmentId: string | undefined;
  if (userId) {
    const dbUser = await userRepo.findById(userId);
    userDepartmentId = dbUser?.departmentId ?? undefined;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiObjectivesClient
        role={role}
        userId={userId}
        userDepartmentId={userDepartmentId}
      />
    </div>
  );
}
