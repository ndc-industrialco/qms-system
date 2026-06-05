import { requireRole } from "@/lib/auth";
import { UserService } from "@/services/userService";
import { DepartmentService } from "@/services/departmentService";
import ItUserTable from "@/components/it/ItUserTable";
import SyncActions from "@/components/it/SyncActions";
import LocalizedEmptyState from "@/components/common/LocalizedEmptyState";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";
import en from "@/messages/en.json";

export const metadata: Metadata = {
  title: en.it.users.title,
};

const userService = new UserService();
const deptService = new DepartmentService();

export default async function ItUsersPage() {
  await requireRole("IT");
  const [users, departments] = await Promise.all([
    userService.getAllUsers(),
    deptService.getActiveDepartments()
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        titleKey="it.users.title"
        subtitleKey="it.users.subtitle"
        subtitleParams={{ count: users.length }}
        actions={<SyncActions />}
      />

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
