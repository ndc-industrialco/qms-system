export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { fetchAllEntraGroups } from "@/services/ms-graph";
import { db } from "@/lib/db";
import { departments } from "@/db/schema";
import type { ApiResponse } from "@/types/api";

export interface SyncDeptResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
}

export async function POST(): Promise<NextResponse<ApiResponse<SyncDeptResult>>> {
  try {
    await requireRole("IT");

    const groups = await fetchAllEntraGroups();
    const result: SyncDeptResult = { total: groups.length, created: 0, updated: 0, skipped: 0 };

    for (const group of groups) {
      if (!group.displayName?.trim()) {
        result.skipped++;
        continue;
      }

      const name = group.displayName.trim();
      const emailGroup = group.mail?.toLowerCase().trim() ?? null;

      const existing = await db.select({ id: departments.id }).from(departments).where(eq(departments.name, name)).limit(1);

      if (existing.length > 0) {
        await db.update(departments).set({ emailGroup }).where(eq(departments.name, name));
        result.updated++;
      } else {
        await db.insert(departments).values({ name, emailGroup, isActive: true });
        result.created++;
      }
    }

    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[sync-departments]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
