import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { searchAuthCenterEmailGroups } from "@/lib/auth-center-admin-client";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().max(100).optional().default(""),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { q } = querySchema.parse({ q: req.nextUrl.searchParams.get("q")?.trim() ?? undefined });

    const groups = await searchAuthCenterEmailGroups(q, { accessToken: session.user.accessToken });
    return sendSuccess(groups, "Groups retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
