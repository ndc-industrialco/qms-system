export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { fetchAllEntraGroups } from "@/services/ms-graph";
import { db } from "@/lib/db";
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

    const valid = groups.filter((g) => g.displayName?.trim());
    const skipped = groups.length - valid.length;

    if (valid.length === 0) {
      return NextResponse.json({ data: { total: groups.length, created: 0, updated: 0, skipped }, error: null });
    }

    let created = 0;
    let updated = 0;

    await Promise.all(
      valid.map(async (g) => {
        const name = g.displayName!.trim();
        const emailGroup = g.mail?.toLowerCase().trim() ?? null;

        const existing = await db.department.findUnique({ where: { name }, select: { id: true } });

        if (existing) {
          await db.department.update({ where: { name }, data: { emailGroup } });
          updated++;
        } else {
          await db.department.create({ data: { name, emailGroup, isActive: true } });
          created++;
        }
      }),
    );

    return NextResponse.json({ data: { total: groups.length, created, updated, skipped }, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    console.error("[sync-departments]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
