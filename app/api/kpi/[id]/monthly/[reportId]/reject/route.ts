import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { rejectReportSchema } from '@/schemas/kpiSchema';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';
import { UserRepository } from '@/repositories/userRepository';
import { sendKpiMonthlyResultEmail } from '@/services/email';

const service = new KpiMonthlyService();
const userRepo = new UserRepository();

export async function POST(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await requireAuth();
    const { reportId } = await params;
    const { reason } = rejectReportSchema.parse(await request.json());
    const updated = await service.rejectReport(reportId, reason, { userId: session.user.id, role: session.user.role, departmentId: session.user.departmentId });

    const detail = await service.getReportById(reportId);
    if (detail.prepareBy) {
      const preparer = await userRepo.findById(detail.prepareBy);
      if (preparer?.email) {
        NotificationService.sendEmailOnce(
          `KPI_MONTHLY:${reportId}:REJECTED:preparer:${preparer.id}`,
          () => sendKpiMonthlyResultEmail({
            to: { name: preparer.name ?? '', email: preparer.email },
            departmentName: detail.kpi.department,
            month: detail.month,
            year: detail.year,
            status: 'REJECTED',
            actorName: session.user.name ?? '',
            reason,
            details: detail.details.map((d) => ({
              objective: d.kpiObjective.objective,
              target: d.kpiObjective.target,
              unit: d.kpiObjective.unit,
              actualResult: d.actualResult,
              achievedStatus: d.achievedStatus,
            })),
            reportId: reportId,
            senderEmail: session.user.email ?? undefined,
          }),
          preparer.email,
          'Monthly KPI Rejected',
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    return sendSuccess(updated, 'Monthly report rejected');
  } catch (error) {
    return handleApiError(error);
  }
}
