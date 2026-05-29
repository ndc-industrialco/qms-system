import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { rejectReportSchema } from '@/schemas/kpiSchema';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await requireAuth();
    const { reportId } = await params;
    const { reason } = rejectReportSchema.parse(await request.json());
    const updated = await service.rejectReport(reportId, reason, { userId: session.user.id, role: session.user.role, departmentId: session.user.departmentId });
    return sendSuccess(updated, 'Monthly report rejected');
  } catch (error) {
    return handleApiError(error);
  }
}
