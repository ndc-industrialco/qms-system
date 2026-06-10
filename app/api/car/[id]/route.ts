import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { carUpdateSchema } from "@/lib/validations/car";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError } from "@/errors/customErrors";
import { type NextRequest } from "next/server";

const carService = new CarService();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const car = await carService.getCarById(id);

    const isPrivileged = session.user.role === "QMS" || session.user.role === "IT" || session.user.role === "MR";
    if (!isPrivileged && car.targetDepartment.id !== session.user.departmentId) {
      throw new ForbiddenError("คุณไม่มีสิทธิ์ดู CAR นี้");
    }

    return sendSuccess(car, "CAR retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "QMS" && session.user.role !== "IT") {
      throw new ForbiddenError("เฉพาะ QMS/IT เท่านั้นที่สามารถแก้ไข CAR ได้");
    }

    const { id } = await params;
    const body = await req.json();
    const input = carUpdateSchema.parse(body);
    const car = await carService.updateCar(id, session.user.id, input);
    return sendSuccess(car, "CAR updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "QMS" && session.user.role !== "IT") {
      throw new ForbiddenError("เฉพาะ QMS/IT เท่านั้นที่สามารถยกเลิก CAR ได้");
    }

    const { id } = await params;
    await carService.cancelCar(id, session.user.id);
    return sendSuccess(null, "CAR cancelled successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
