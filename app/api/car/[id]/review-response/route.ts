import { CarService } from "@/services/carService";
import { carReviewResponseSchema } from "@/lib/validations/car";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";

const carService = new CarService();

// No session required — MR reviews via ActionToken link from email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const input = carReviewResponseSchema.parse(body);
    const car = await carService.reviewResponseByMR(id, input);
    return sendSuccess(car, input.action === "APPROVED" ? "แผนการแก้ไขได้รับการอนุมัติแล้ว" : "แผนการแก้ไขถูกปฏิเสธ — แผนกจะได้รับแจ้งให้แก้ไขใหม่");
  } catch (err) {
    return handleApiError(err);
  }
}
