import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CarService } from "@/services/carService";
import CarListTable from "@/components/car/CarListTable";
import CarFormDrawerTrigger from "@/components/car/CarFormDrawerTrigger";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CAR - QMS" };

const carService = new CarService();

export default async function QmsCarListPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role !== "QMS" && role !== "IT" && role !== "MR") redirect("/dashboard");

  const cars = await carService.listCars({ page: 1, limit: 20 }, {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="CAR - คำร้องขอแก้ไข"
        subtitle="Corrective Action Requests"
        actions={role === "QMS" || role === "IT" ? <CarFormDrawerTrigger /> : undefined}
      />
      <CarListTable initialData={cars} isPrivileged />
    </div>
  );
}
