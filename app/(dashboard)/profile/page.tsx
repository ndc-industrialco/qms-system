import { requireAuth } from "@/lib/auth";
import { UserRepository } from "@/repositories/userRepository";
import { DepartmentService } from "@/services/departmentService";
import { t } from "@/lib/i18n";
import PageHeader from "@/components/common/PageHeader";
import ProfileClient from "@/components/profile/ProfileClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile",
};

const userRepo = new UserRepository();
const deptService = new DepartmentService();

export default async function ProfilePage() {
  const session = await requireAuth();
  const [user, departments] = await Promise.all([
    userRepo.findById(session.user.id),
    deptService.getActiveDepartments(),
  ]);

  if (!user) return null;

  const departmentName = user.departmentId
    ? departments.find((d: { id: string; name: string }) => d.id === user.departmentId)?.name ?? null
    : null;

  const profile = {
    id: user.id,
    name: user.name,
    email: user.email,
    employeeId: user.employeeId ?? null,
    position: user.position ?? null,
    departmentId: user.departmentId ?? null,
    savedSignatureUrl: user.savedSignatureUrl ?? null,
    signatureType: user.signatureType ?? null,
    image: user.image ?? null,
    role: user.role,
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8">
      <PageHeader
        title={t("profile.title", "th")}
        subtitle={t("profile.subtitle", "th")}
      />
      <ProfileClient profile={profile} departmentName={departmentName} />
    </div>
  );
}
