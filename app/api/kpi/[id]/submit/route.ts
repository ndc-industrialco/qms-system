import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { submitKpiObjectivesSchema } from '@/schemas/kpiSchema';
import { KpiService } from '@/services/kpiService';

const service = new KpiService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = submitKpiObjectivesSchema.parse(await request.json());
    const updated = await service.submitObjectives(
      id,
      { ...body, preparerAuthUserId: body.preparerAuthUserId ?? session.user.authUserId ?? null },
      session.user.id,
      session.user.email ?? undefined,
    );

    return sendSuccess(updated, 'KPI objectives submitted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
