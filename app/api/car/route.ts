import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { carCreateSchema, carListQuerySchema } from "@/lib/validations/car";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError } from "@/errors/customErrors";
import { type NextRequest } from "next/server";

const carService = new CarService();

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const isPrivileged = session.user.role === "QMS" || session.user.role === "IT" || session.user.role === "MR";
    const searchParams = req.nextUrl.searchParams;
    const query = carListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sourceType: searchParams.get("sourceType") ?? undefined,
    });

    if (isPrivileged) {
      const result = await carService.listCars(query, {});
      return sendSuccess(result.data, "CARs retrieved successfully", 200, result.meta);
    }

    const departmentId = session.user.departmentId;
    if (!departmentId) {
      return sendSuccess([], "No department assigned", 200, {
        page: query.page,
        limit: query.limit,
        total: 0,
      });
    }

    const result = await carService.listCars(query, { departmentId });
    return sendSuccess(result.data, "CARs retrieved successfully", 200, result.meta);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "QMS" && session.user.role !== "IT") {
      throw new ForbiddenError("เฉพาะ QMS/IT เท่านั้นที่สามารถสร้าง CAR ได้");
    }

    const body = await req.json();
    const input = carCreateSchema.parse(body);
    // Allow QMS/IT to designate a different person as issuer; fall back to session user
    const effectiveIssuerId = input.issuerId ?? session.user.id;
    const car = await carService.createCar(effectiveIssuerId, input);
    return sendSuccess(car, "CAR created successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
