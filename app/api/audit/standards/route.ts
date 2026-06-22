import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError } from "@/lib/errors";
import { db } from "@/lib/db";
import { z } from "zod";
import { type NextRequest } from "next/server";

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);

export async function GET() {
  try {
    await requireAuth();
    const list = await db.auditStandard.findMany({
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    return sendSuccess(list, "OK");
  } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();
    const { name } = z.object({ name: z.string().min(1) }).parse(await req.json());
    const std = await db.auditStandard.create({ data: { name } });
    return sendSuccess(std, "Created", 201);
  } catch (err) { return handleApiError(err); }
}
