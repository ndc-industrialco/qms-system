import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { CarService } from "@/services/carService";
import CarDetailClient from "@/components/car/CarDetailClient";
import { ForbiddenError } from "@/errors/customErrors";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CAR Detail" };

const carService = new CarService();

export default async function UserCarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  let car;
  try {
    car = await carService.getCarById(id);
  } catch (err) {
    if (err instanceof ForbiddenError) redirect("/car");
    notFound();
  }

  // USER can only view their own department's CARs
  if (
    session.user.role === "USER" &&
    car.targetDepartment.id !== session.user.departmentId
  ) {
    redirect("/car");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <CarDetailClient
        car={car}
        userRole={session.user.role}
        userId={session.user.id}
        userDepartmentId={session.user.departmentId ?? null}
        isPrivileged={false}
      />
    </div>
  );
}
