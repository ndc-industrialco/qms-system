import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';

const service = new KpiService();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const updated = await service.recallObjectives(id, {
      userId: session.user.id,
      role: session.user.role,
      departmentId: session.user.departmentId,
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
    });

    return sendSuccess(updated, 'KPI recalled successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
