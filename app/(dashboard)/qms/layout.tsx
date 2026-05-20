export const runtime = 'edge';

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ForbiddenError } from "@/lib/errors";

export default async function QmsLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireRole("QMS", "MR", "IT");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/unauthorized?reason=insufficient_role");
    throw e;
  }
  return <>{children}</>;
}
