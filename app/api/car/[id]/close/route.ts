import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { carCloseSchema } from "@/lib/validations/car";
import { ForbiddenError } from "@/errors/customErrors";
import { CarService } from "@/services/carService";

const carService = new CarService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const input = carCloseSchema.parse(body);

    const car = input.token
      ? await carService.closeCar(id, input.token, input.comment)
      : await (async () => {
          const session = await requireAuth();
          if (session.user.role !== "MR") {
            throw new ForbiddenError("Only MR can sign off this CAR.");
          }

          return carService.closeCarAuthenticated(
            id,
            session.user.id,
            input.comment,
            session.user.authUserId,
          );
        })();

    return sendSuccess(car, "CAR closed successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
