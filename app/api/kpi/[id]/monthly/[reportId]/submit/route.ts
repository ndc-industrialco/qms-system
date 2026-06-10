import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';
import { UserRepository } from '@/repositories/userRepository';
import { sendKpiMonthlyApprovalRequestEmail } from '@/services/email';
import { ActionTokenService } from '@/services/actionTokenService';
import { ApprovalModule, ApprovalStep } from '@/generated/prisma/client';

const service = new KpiMonthlyService();
const userRepo = new UserRepository();

export async function POST(_req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await requireAuth();
    const { reportId } = await params;
    const body = await _req.json().catch(() => ({}));
    const updated = await service.submitReport(reportId, { userId: session.user.id, role: session.user.role, departmentId: session.user.departmentId }, body);

    const detail = await service.getReportById(reportId);
    
    // Fallback to KPI's reviewer if not provided in body
    const reviewerId = body.reviewerUserId || detail.kpi.reviewerUserId;
    if (reviewerId) {
      const [reviewer, preparer] = await Promise.all([
        userRepo.findById(reviewerId),
        userRepo.findById(session.user.id),
      ]);
      if (reviewer?.email) {
        await ActionTokenService.revokeByDocument(ApprovalModule.KPI_MONTHLY, reportId);
        const reviewerToken = await ActionTokenService.issue({
          module: ApprovalModule.KPI_MONTHLY,
          documentId: reportId,
          role: ApprovalStep.REVIEWER,
          issuedTo: reviewerId,
          metadata: { kpiId: detail.kpi.id },
        });

        NotificationService.sendEmailOnce(
          `KPI_MONTHLY:${reportId}:SUBMITTED:reviewer:${reviewer.id}:${reviewerToken.substring(0, 16)}`,
          () => sendKpiMonthlyApprovalRequestEmail({
            approver: { name: reviewer.name ?? '', email: reviewer.email },
            departmentName: detail.kpi.department,
            month: detail.month,
            year: detail.year,
            preparerName: preparer?.name ?? session.user.name ?? '',
            details: detail.details.map((d) => ({
              objective: d.kpiObjective.objective,
              target: d.kpiObjective.target,
              unit: d.kpiObjective.unit,
              actualResult: d.actualResult,
              achievedStatus: d.achievedStatus,
            })),
            actionToken: reviewerToken,
            senderEmail: session.user.email ?? undefined,
          }),
          reviewer.email,
          'Monthly KPI Review Request',
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    return sendSuccess(updated, 'Monthly report submitted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
