export const runtime = 'edge';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { fetchAllEntraUsers } from "@/services/ms-graph";
import { syncEntraUsers, type SyncResult } from "@/services/user";
import type { ApiResponse } from "@/types/api";

/**
 * POST /api/it/sync-users
 *
 * Pulls all M365-licensed member accounts from Microsoft Entra ID and
 * upserts them into the local database. Restricted to IT role.
 *
 * Response: { data: SyncResult, error: null }
 */
export async function POST(): Promise<NextResponse<ApiResponse<SyncResult>>> {
  try {
    await requireRole("IT");

    const entraUsers = await fetchAllEntraUsers();
    const result = await syncEntraUsers(entraUsers);

    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[sync-users]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
