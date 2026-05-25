
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ForbiddenError } from "@/lib/errors";

export default async function ItLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireRole("IT");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/unauthorized?reason=insufficient_role");
    throw e;
  }
  return <>{children}</>;
}
