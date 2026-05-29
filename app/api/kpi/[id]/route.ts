import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { updateKpiSchema } from '@/schemas/kpiSchema';
import { KpiService } from '@/services/kpiService';

const service = new KpiService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const kpi = await service.getKpiById(id);
    return sendSuccess(kpi, 'KPI retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = updateKpiSchema.parse(await request.json());
    const updated = await service.updateKpi(id, body);
    return sendSuccess(updated, 'KPI updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    await service.deleteKpi(id);
    return sendSuccess(null, 'KPI deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
