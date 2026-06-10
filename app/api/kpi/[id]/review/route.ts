import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { UserRepository } from '@/repositories/userRepository';
import { sendKpiApprovalRequestEmail } from '@/services/email';

const service = new KpiService();
const userRepo = new UserRepository();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await _request.json().catch(() => ({}));
    const updated = await service.reviewObjectives(id, {
      userId: session.user.id,
      role: session.user.role,
      departmentId: session.user.departmentId,
    }, body);

    if (updated.approverUserId) {
      const approver = await userRepo.findById(updated.approverUserId);
      if (approver?.email) {
        NotificationService.sendEmailOnce(
          `KPI:${id}:REVIEWED:approver:${approver.id}:${(updated.approverToken ?? '').substring(0, 16)}`,
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
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    return sendSuccess(updated, 'KPI reviewed successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
