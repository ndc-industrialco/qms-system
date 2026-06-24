import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';
import { getUserSnapshot } from '@/lib/userSnapshotCache';
import { NotificationService } from '@/services/notificationService';
import { sendKpiMonthlyApprovalRequestEmail, sendKpiMonthlyResultEmail } from '@/services/email';
import { ActionTokenService } from '@/services/actionTokenService';
import { ApprovalModule, ApprovalStep } from '@/generated/prisma/client';

const service = new KpiMonthlyService();

export async function POST(_req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await requireAuth();
    const { reportId } = await params;
    const body = await _req.json().catch(() => ({}));
    const updated = await service.reviewReport(reportId, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    }, body);

    if (updated.status === 'PENDING_APPROVAL') {
      const detail = await service.getReportById(reportId);
      const approverId = detail.kpi.approverUserId;
      if (approverId) {
        const approverAuthId = (() => {
          const sig = detail.approvalSignatures?.find((s: { step: string }) => s.step === 'APPROVER');
          return (sig as Record<string, unknown>)?.signerAuthUserId as string | null | undefined
            ?? (detail.kpi as Record<string, unknown>).approverAuthUserId as string | null | undefined
            ?? approverId;
        })();
        const approver = await getUserSnapshot(approverAuthId);
          await ActionTokenService.revokeByDocument(ApprovalModule.KPI_MONTHLY, reportId);
          const approverToken = await ActionTokenService.issue({
            module: ApprovalModule.KPI_MONTHLY,
            documentId: reportId,
            role: ApprovalStep.APPROVER,
            issuedTo: approverAuthId,
            metadata: { kpiId: detail.kpi.id },
          });

          NotificationService.sendEmailOnce(
            `KPI_MONTHLY:${reportId}:REVIEWED:approver:${approverAuthId}:${approverToken.substring(0, 16)}`,
            () => sendKpiMonthlyApprovalRequestEmail({
              approver: { name: approver?.name ?? '', email: approver?.email ?? '' },
              departmentName: detail.kpi.department,
              month: detail.month,
              year: detail.year,
              preparerName: session.user.name ?? '',
              details: detail.details.map((d) => ({
                objective: d.kpiObjective.objective,
                target: d.kpiObjective.target,
                unit: d.kpiObjective.unit,
                actualResult: d.actualResult,
                achievedStatus: d.achievedStatus,
              })),
              actionToken: approverToken,
              senderAccessToken: session.user.accessToken,
            }),
            approver?.email ?? '',
            'Monthly KPI Approval Request',
            approverAuthId,
            {
              title: "มี KPI รายเดือนรอการอนุมัติ",
              body: `KPI ${detail.kpi.department} ${detail.month}/${detail.year}`,
              module: "KPI",
              resourceId: reportId,
              resourceType: "KPI_MONTHLY",
            },
          ).catch(() => { /* logged inside NotificationService */ });
      }
    } else if (updated.status === 'APPROVED') {
      const detail = await service.getReportById(reportId);
      const preparerSigApproved = detail.approvalSignatures?.find((s: { step: string }) => s.step === 'PREPARER');
      const preparerAuthIdApproved = (preparerSigApproved as Record<string, unknown>)?.signerAuthUserId as string | null | undefined;
      const preparer = preparerAuthIdApproved ? await getUserSnapshot(preparerAuthIdApproved) : null;
        NotificationService.sendEmailOnce(
          `KPI_MONTHLY:${reportId}:APPROVED:preparer:${preparerAuthIdApproved}`,
          () => sendKpiMonthlyResultEmail({
          to: { name: preparer?.name ?? '', email: preparer?.email ?? '' },
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
            senderAccessToken: session.user.accessToken,
          }),
          preparer?.email ?? '',
          'Monthly KPI Approved',
          preparerAuthIdApproved ?? undefined,
          {
            title: "KPI รายเดือนได้รับการอนุมัติ",
            body: `KPI ${detail.kpi.department} ${detail.month}/${detail.year}`,
            module: "KPI",
            resourceId: reportId,
            resourceType: "KPI_MONTHLY",
          },
        ).catch(() => { /* logged inside NotificationService */ });
    }

    return sendSuccess(updated, 'Monthly report reviewed successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
