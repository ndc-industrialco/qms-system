import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import CarMrSignDialog from "@/components/car/CarMrSignDialog";
import CarStatusBadge from "@/components/car/CarStatusBadge";

export const metadata: Metadata = { title: "CAR Sign-off" };

const carService = new CarService();

export default async function CarMrSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    const session = await requireAuth();
    if (session.user.role !== "MR") notFound();
  }

  let car;
  try {
    car = await carService.getCarById(id);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full max-w-lg space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">CAR Sign-off</h1>
          <p className="mt-1 text-sm text-gray-500">Management representative confirmation</p>
        </div>

        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-gray-700">{car.carNo}</span>
            <CarStatusBadge status={car.status} />
          </div>
          <p className="text-xs text-gray-500">Department: {car.targetDepartment.name}</p>
          <p className="line-clamp-2 text-xs text-gray-600">{car.defectDetail}</p>
        </div>

        <CarMrSignDialog carId={id} carNo={car.carNo} token={token} />
      </div>
    </div>
  );
}
