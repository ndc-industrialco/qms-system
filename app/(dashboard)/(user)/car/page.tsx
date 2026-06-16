import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CarService } from "@/services/carService";
import CarListTable from "@/components/car/CarListTable";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CAR ของแผนก" };

const carService = new CarService();

export default async function UserCarListPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const authDepartmentId = session.user.authDepartmentId;
  const departmentId = session.user.departmentId;
  const hasScope = !!(authDepartmentId || departmentId);
  const cars = hasScope
    ? await carService.listCars({ page: 1, limit: 20 }, { departmentId, authDepartmentId })
    : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="CAR ของแผนก"
        subtitle="Corrective Action Requests สำหรับแผนกของคุณ"
      />
      {!hasScope ? (
        <p className="text-sm text-gray-500">บัญชีของคุณยังไม่ได้ผูกกับแผนก</p>
      ) : (
        <CarListTable initialData={cars} isPrivileged={false} />
      )}
    </div>
  );
}
