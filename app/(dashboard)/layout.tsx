
import { requireAuth } from "@/lib/auth";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  return (
    <DashboardShell
      role={session.user.role}
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      image={session.user.image}
    >
      {children}
    </DashboardShell>
  );
}
