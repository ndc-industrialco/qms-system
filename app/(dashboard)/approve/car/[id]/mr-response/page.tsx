import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";
import CarMrResponseReviewPanel from "@/components/car/CarMrResponseReviewPanel";
import CarStatusBadge from "@/components/car/CarStatusBadge";

export const metadata: Metadata = { title: "CAR Plan Review" };

const carService = new CarService();
const userPrefRepo = new UserPreferenceRepository();

export default async function CarMrResponseReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; action?: string }>;
}) {
  const { id } = await params;
  const { token, action } = await searchParams;

  let authUserId: string | undefined;
  if (!token) {
    const session = await requireAuth();
    if (session.user.role !== "MR") notFound();
    authUserId = session.user.authUserId ?? undefined;
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
        <div className="max-w-md rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
          <div className="mb-3 text-4xl">{isAlreadyReviewed ? "✓" : "⏳"}</div>
          <h2 className="text-lg font-bold text-slate-800">
            {isAlreadyReviewed ? "ตรวจสอบเรียบร้อยแล้ว" : "CAR ยังไม่พร้อมสำหรับการตรวจสอบ"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isAlreadyReviewed
              ? `CAR ${car.carNo} ได้รับการตรวจสอบแล้ว`
              : `สถานะปัจจุบัน: ${car.status}`}
          </p>
          <div className="mt-3 flex justify-center">
            <CarStatusBadge status={car.status} />
          </div>
        </div>
      </div>
    );
  }

  const savedSig = authUserId ? await userPrefRepo.findByAuthUserId(authUserId) : null;
  const defaultAction = action === "APPROVED" || action === "REJECTED" ? action : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6">
      <CarMrResponseReviewPanel
        carId={id}
        car={car}
        token={token}
        defaultAction={defaultAction}
        savedSignatureUrl={savedSig?.savedSignatureUrl ?? null}
        savedSignatureType={savedSig?.signatureType ?? null}
      />
    </div>
  );
}
