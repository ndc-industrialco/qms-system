import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { UserRepository } from '@/repositories/userRepository';
import { sendKpiResultEmail } from '@/services/email';

const service = new KpiService();
const userRepo = new UserRepository();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await _request.json().catch(() => ({}));
    const updated = await service.approveObjectives(id, {
      userId: session.user.id,
      role: session.user.role,
      departmentId: session.user.departmentId,
    }, body);

    const recipients = [updated.reviewerUserId, updated.approverUserId].filter(Boolean) as string[];
    if (recipients.length > 0) {
      const users = await Promise.all(recipients.map((uid) => userRepo.findById(uid)));
      for (const u of users.filter((u): u is NonNullable<typeof u> => Boolean(u?.email))) {
        NotificationService.sendEmailOnce(
          `KPI:${id}:APPROVED:notify:${u.id}`,
          () => sendKpiResultEmail({
            to: { name: u.name ?? '', email: u.email },
            departmentName: updated.department,
            year: updated.yearly,
            status: 'APPROVED',
            actorName: session.user.name ?? '',
            kpiId: id,
            objectives: updated.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
            senderEmail: session.user.email ?? undefined,
          }),
          u.email,
          'KPI Approved',
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    return sendSuccess(updated, 'KPI approved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
