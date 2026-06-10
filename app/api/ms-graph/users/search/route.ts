import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { searchEntraUsers, fetchAllEntraUsers } from "@/services/ms-graph";
import { UserService } from "@/services/userService";
import { z } from "zod";

export interface ReviewerCandidate {
  id: string;
  name: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
}

const querySchema = z.object({
  q: z.string().max(100).optional().default(""),
});

const userService = new UserService();

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { q } = querySchema.parse({ q: req.nextUrl.searchParams.get("q")?.trim() ?? undefined });

    const graphUsers = q.length === 0
      ? (await fetchAllEntraUsers()).slice(0, 100)
      : await searchEntraUsers(q);

    const msUserIds = graphUsers.map((u) => u.id).filter(Boolean) as string[];
    if (msUserIds.length === 0) {
      return sendSuccess([], "No users found");
    }

    const dbUsers = await userService.findByMsUserIds(msUserIds);
    const msToDbId = new Map(dbUsers.map((u) => [u.msUserId!, u.id]));

    const results: ReviewerCandidate[] = graphUsers
      .filter((u) => msToDbId.has(u.id))
      .map((u) => ({
        id: msToDbId.get(u.id)!,
        name: u.displayName ?? "",
        email: u.mail ?? u.userPrincipalName,
        employeeId: u.employeeId,
        department: u.department,
        jobTitle: u.jobTitle,
      }));

    return sendSuccess(results, "Users retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
