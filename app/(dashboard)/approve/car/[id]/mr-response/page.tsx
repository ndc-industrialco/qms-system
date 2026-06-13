import { notFound } from "next/navigation";
import { CarService } from "@/services/carService";
import CarMrResponseReviewPanel from "@/components/car/CarMrResponseReviewPanel";
import CarStatusBadge from "@/components/car/CarStatusBadge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ตรวจสอบแผนการแก้ไข CAR" };

const carService = new CarService();

export default async function CarMrResponseReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; action?: string }>;
}) {
  const { id } = await params;
  const { token, action } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl bg-rose-50 border border-rose-200 p-8 text-center">
          <div className="text-4xl mb-3">❌</div>
          <h2 className="text-lg font-bold text-rose-800">ลิงก์ไม่ถูกต้อง</h2>
          <p className="mt-1 text-sm text-rose-700">กรุณาตรวจสอบ inbox สำหรับลิงก์ที่ถูกต้อง</p>
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

  if (car.status !== "RESPONDED") {
    const isAlreadyReviewed = !!car.mrResponseReview;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl bg-slate-50 border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-3">{isAlreadyReviewed ? "✅" : "⚠️"}</div>
          <h2 className="text-lg font-bold text-slate-800">
            {isAlreadyReviewed ? "ดำเนินการแล้ว" : "ไม่สามารถดำเนินการได้"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isAlreadyReviewed
              ? `CAR ${car.carNo} ได้รับการตรวจสอบแผนแล้ว (${car.mrResponseReview!.action === "APPROVED" ? "อนุมัติ" : "ปฏิเสธ"})`
              : `CAR ${car.carNo} อยู่ในสถานะ "${car.status}" ไม่รองรับการตรวจสอบแผน`}
          </p>
          <div className="mt-3 flex justify-center">
            <CarStatusBadge status={car.status} />
          </div>
        </div>
      </div>
    );
  }

  const defaultAction =
    action === "APPROVED" || action === "REJECTED" ? action : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">ตรวจสอบแผนการแก้ไข CAR</h1>
          <p className="text-sm text-gray-500 mt-1">MR Review — Corrective Action Plan</p>
        </div>

        <CarMrResponseReviewPanel
          carId={id}
          car={car}
          token={token}
          defaultAction={defaultAction}
        />
      </div>
    </div>
  );
}
