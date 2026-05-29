import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();

export async function POST(_req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await requireAuth();
    const { reportId } = await params;
    const updated = await service.reviewReport(reportId, { userId: session.user.id, role: session.user.role, departmentId: session.user.departmentId });
    return sendSuccess(updated, 'Monthly report reviewed successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
