import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { year } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));

    const kpis = await db.kPI.findMany({
      where: { yearly: year },
      select: {
        id: true,
        department: true,
        yearly: true,
        objectives: { select: { id: true } },
        monthlyReports: {
          where: { year },
          select: { id: true, month: true, status: true },
        },
      },
      orderBy: { department: 'asc' },
    });

    const data = kpis.map((k) => {
      const monthMap: Record<string, { id: string; status: string } | null> = {};
      for (const r of k.monthlyReports) {
        monthMap[r.month] = { id: r.id, status: r.status };
      }
      return {
        id: k.id,
        department: k.department,
        yearly: k.yearly,
        objectiveCount: k.objectives.length,
        months: monthMap,
      };
    });

    return sendSuccess(data, 'Monthly summary retrieved');
  } catch (error) {
    return handleApiError(error);
  }
}
