
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { searchEntraUsers, fetchAllEntraUsers } from "@/services/ms-graph";
import { handleApiError } from "@/lib/apiErrorHandler";
import { z } from "zod";

export interface ReviewerCandidate {
  id: string;
  name: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const querySchema = z.object({
      q: z.string().max(100).optional().default(""),
    });
    const { q } = querySchema.parse({ q: req.nextUrl.searchParams.get("q")?.trim() ?? undefined });

    // Empty query → return all synced Graph users (capped at 100)
    // Non-empty query → search Graph by displayName / mail
    const graphUsers = q.length === 0
      ? (await fetchAllEntraUsers()).slice(0, 100)
      : await searchEntraUsers(q);

    const msUserIds = graphUsers.map((u) => u.id).filter(Boolean) as string[];
    if (msUserIds.length === 0) {
      return NextResponse.json({ data: [], error: null });
    }

    // Cross-reference with local DB to get internal user IDs
    const dbUsers = await db.user.findMany({
      where: { msUserId: { in: msUserIds } },
      select: { id: true, msUserId: true },
    });

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

    return NextResponse.json({ data: results, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
