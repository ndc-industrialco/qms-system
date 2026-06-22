import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import CarMrResponseReviewPanel from "@/components/car/CarMrResponseReviewPanel";
import CarStatusBadge from "@/components/car/CarStatusBadge";

export const metadata: Metadata = { title: "CAR Plan Review" };

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
    const session = await requireAuth();
    if (session.user.role !== "MR") notFound();
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
          <div className="mb-3 text-4xl">{isAlreadyReviewed ? "Done" : "Wait"}</div>
          <h2 className="text-lg font-bold text-slate-800">
            {isAlreadyReviewed ? "Review already completed" : "This CAR is not ready for plan review"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isAlreadyReviewed
              ? `CAR ${car.carNo} already has an MR review recorded.`
              : `Current status: ${car.status}`}
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto w-full max-w-xl space-y-5 rounded-2xl bg-white p-6 shadow-lg">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">CAR Corrective Action Review</h1>
          <p className="mt-1 text-sm text-gray-500">Management representative approval step</p>
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
