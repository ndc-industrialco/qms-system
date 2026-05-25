
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getReviewerCandidates } from "@/services/dar";
import type { ApiResponse } from "@/types/api";
import type { ReviewerCandidate } from "@/types/dar";

export async function GET(): Promise<NextResponse<ApiResponse<ReviewerCandidate[]>>> {
  try {
    await requireAuth();
    const candidates = await getReviewerCandidates();
    return NextResponse.json({ data: candidates, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/dar/reviewer-candidates]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
