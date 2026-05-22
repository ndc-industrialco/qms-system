export const runtime = 'nodejs';

import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ForbiddenError } from "@/lib/errors";
import { getAllUsers } from "@/services/user";
import MrManagementClient from "@/components/qms/MrManagementClient";

export default async function QmsMrPage() {
  try {
    await requireRole("QMS", "IT");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/unauthorized?reason=insufficient_role");
    throw e;
  }

  const users = await getAllUsers();

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      <MrManagementClient initialUsers={users} />
    </div>
  );
}
