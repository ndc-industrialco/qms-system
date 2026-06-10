import { CarService } from "@/services/carService";
import { carCloseSchema } from "@/lib/validations/car";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";

const carService = new CarService();

// No session required — MR signs via ActionToken link from email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const input = carCloseSchema.parse(body);
    const car = await carService.closeCar(id, input.token, input.comment);
    return sendSuccess(car, "CAR closed successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
