export const runtime = 'edge';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { fetchAllEntraGroups } from "@/services/ms-graph";
import { prisma } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

export interface SyncDeptResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
}

/**
 * POST /api/it/sync-departments
 *
 * Pulls all mail-enabled M365 groups from Entra ID and upserts them as
 * departments (name + emailGroup). Restricted to IT role.
 */
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

      const existing = await prisma.department.findUnique({ where: { name }, select: { id: true } });

      await prisma.department.upsert({
        where: { name },
        create: { name, emailGroup, isActive: true },
        update: { emailGroup },
      });

      if (existing) {
        result.updated++;
      } else {
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
