import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { searchEntraGroups, fetchAllEntraGroups } from "@/services/ms-graph";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().max(100).optional().default(""),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { q } = querySchema.parse({ q: req.nextUrl.searchParams.get("q")?.trim() ?? undefined });

    const groups = q ? await searchEntraGroups(q) : await fetchAllEntraGroups();

    const results = groups
      .filter((g) => g.mail)
      .map((g) => ({ id: g.id, displayName: g.displayName, mail: g.mail, description: g.description }));

    return sendSuccess(results, "Groups retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
