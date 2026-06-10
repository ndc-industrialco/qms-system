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
    const body = await _req.json().catch(() => ({}));
    const updated = await service.reviewReport(reportId, { userId: session.user.id, role: session.user.role, departmentId: session.user.departmentId }, body);

    if (updated.status === 'PENDING_APPROVAL') {
      const detail = await service.getReportById(reportId);
      const approverId = detail.kpi.approverUserId;
      if (approverId) {
        const { UserRepository } = await import('@/repositories/userRepository');
        const userRepo = new UserRepository();
        const [approver, preparer] = await Promise.all([
          userRepo.findById(approverId),
          detail.prepareBy ? userRepo.findById(detail.prepareBy) : null,
        ]);
        if (approver?.email) {
          const { ActionTokenService } = await import('@/services/actionTokenService');
          const { ApprovalModule, ApprovalStep } = await import('@/generated/prisma/client');
          const { NotificationService } = await import('@/services/notificationService');
          const { sendKpiMonthlyApprovalRequestEmail } = await import('@/services/email');
          
          await ActionTokenService.revokeByDocument(ApprovalModule.KPI_MONTHLY, reportId);
          const approverToken = await ActionTokenService.issue({
            module: ApprovalModule.KPI_MONTHLY,
            documentId: reportId,
            role: ApprovalStep.APPROVER,
            issuedTo: approverId,
            metadata: { kpiId: detail.kpi.id },
          });

          NotificationService.sendEmailOnce(
            `KPI_MONTHLY:${reportId}:REVIEWED:approver:${approver.id}:${approverToken.substring(0, 16)}`,
            () => sendKpiMonthlyApprovalRequestEmail({
              approver: { name: approver.name ?? '', email: approver.email },
              departmentName: detail.kpi.department,
              month: detail.month,
              year: detail.year,
              preparerName: preparer?.name ?? '',
              details: detail.details.map((d) => ({
                objective: d.kpiObjective.objective,
                target: d.kpiObjective.target,
                unit: d.kpiObjective.unit,
                actualResult: d.actualResult,
                achievedStatus: d.achievedStatus,
              })),
              actionToken: approverToken,
              senderEmail: session.user.email ?? undefined,
            }),
            approver.email,
            'Monthly KPI Approval Request',
          ).catch(() => { /* logged inside NotificationService */ });
        }
      }
    } else if (updated.status === 'APPROVED') {
      const detail = await service.getReportById(reportId);
      if (detail.prepareBy) {
        const { UserRepository } = await import('@/repositories/userRepository');
        const userRepo = new UserRepository();
        const preparer = await userRepo.findById(detail.prepareBy);
        if (preparer?.email) {
          const { NotificationService } = await import('@/services/notificationService');
          const { sendKpiMonthlyResultEmail } = await import('@/services/email');
          
          NotificationService.sendEmailOnce(
            `KPI_MONTHLY:${reportId}:APPROVED:preparer:${preparer.id}`,
            () => sendKpiMonthlyResultEmail({
              to: { name: preparer.name ?? '', email: preparer.email },
              departmentName: detail.kpi.department,
              month: detail.month,
              year: detail.year,
              status: 'APPROVED',
              actorName: session.user.name ?? '',
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
            'Monthly KPI Approved',
          ).catch(() => { /* logged inside NotificationService */ });
        }
      }
    }

    return sendSuccess(updated, 'Monthly report reviewed successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
