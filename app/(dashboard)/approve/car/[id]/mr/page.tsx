import { notFound } from "next/navigation";
import { CarService } from "@/services/carService";
import CarMrSignDialog from "@/components/car/CarMrSignDialog";
import CarStatusBadge from "@/components/car/CarStatusBadge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ลงนามปิด CAR" };

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
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl bg-red-50 border border-red-200 p-8 text-center">
          <div className="text-4xl mb-3">❌</div>
          <h2 className="text-lg font-bold text-red-800">ลิงก์ไม่ถูกต้อง</h2>
          <p className="mt-1 text-sm text-red-700">กรุณาตรวจสอบ inbox สำหรับลิงก์ที่ถูกต้อง</p>
        </div>
      </div>
    );
  }

  let car;
  try {
    car = await carService.getCarById(id);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">ลงนามปิด CAR</h1>
          <p className="text-sm text-gray-500 mt-1">MR Sign-off</p>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 font-mono">{car.carNo}</span>
            <CarStatusBadge status={car.status} />
          </div>
          <p className="text-xs text-gray-500">แผนก: {car.targetDepartment.name}</p>
          <p className="text-xs text-gray-600 line-clamp-2">{car.defectDetail}</p>
        </div>

        <CarMrSignDialog carId={id} carNo={car.carNo} token={token} />
      </div>
    </div>
  );
}
