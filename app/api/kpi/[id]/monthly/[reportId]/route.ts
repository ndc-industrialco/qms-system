import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    await requireAuth();
    const { reportId } = await params;
    const report = await service.getReportById(reportId);
    return sendSuccess(report, 'Monthly report retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
