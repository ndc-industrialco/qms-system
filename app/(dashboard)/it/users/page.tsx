export const runtime = 'nodejs';

import { requireRole } from "@/lib/auth";
import { getAllUsers } from "@/services/user";
import { getActiveDepartments } from "@/services/department";
import ItUserTable from "@/components/it/ItUserTable";
import SyncActions from "@/components/it/SyncActions";
import LocalizedEmptyState from "@/components/common/LocalizedEmptyState";
import ItUsersPageHeader from "@/components/it/ItUsersPageHeader";

export default async function ItUsersPage() {
  await requireRole("IT");
  const [users, departments] = await Promise.all([getAllUsers(), getActiveDepartments()]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <ItUsersPageHeader userCount={users.length} />
        <SyncActions />
      </div>

      {users.length === 0 ? (
        <LocalizedEmptyState
          titleKey="emptyUsers"
          descriptionKey="emptyUsersDesc"
        />
      ) : (
        <ItUserTable users={users} departments={departments} />
      )}
    </div>
  );
}
