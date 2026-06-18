import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { getUserSnapshot } from '@/lib/userSnapshotCache';
import { sendKpiApprovalRequestEmail } from '@/services/email';

const service = new KpiService();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await _request.json().catch(() => ({}));
    const updated = await service.reviewObjectives(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    }, body);

    if (updated.approverUserId) {
      const approver = await getUserSnapshot(updated.approverUserId);
      if (approver?.email) {
        NotificationService.sendEmailOnce(
          `KPI:${id}:REVIEWED:approver:${updated.approverUserId}:${(updated.approverToken ?? '').substring(0, 16)}`,
          () => sendKpiApprovalRequestEmail({
            approver: { name: approver.name ?? '', email: approver.email },
            departmentName: updated.department,
            year: updated.yearly,
            reviewerName: session.user.name ?? '',
            objectives: updated.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
            actionToken: updated.approverToken ?? '',
            senderEmail: session.user.email ?? undefined,
          }),
          approver.email,
          'KPI Approval Request',
          updated.approverUserId,
          {
            title: "มี KPI รอการอนุมัติ",
            body: `KPI ${updated.department} ${updated.yearly}`,
            module: "KPI",
            resourceId: id,
            resourceType: "KPI",
          },
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    return sendSuccess(updated, 'KPI reviewed successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
