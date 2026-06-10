import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { carRespondSchema } from "@/lib/validations/car";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";

const carService = new CarService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = carRespondSchema.parse(body);

    const car = await carService.respondToCar(
      id,
      session.user.id,
      session.user.departmentId,
      input
    );
    return sendSuccess(car, "CAR response submitted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
