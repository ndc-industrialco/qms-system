import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { getUserSnapshot } from '@/lib/userSnapshotCache';
import { ApprovalSignatureRepository } from '@/repositories/approvalSignatureRepository';
import { sendKpiResultEmail, sendKpiRejectedPreparerEmail } from '@/services/email';

const service = new KpiService();
const approvalSigRepo = new ApprovalSignatureRepository();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const signatures = await approvalSigRepo.findByDocument('KPI', id);
    const preparerSig = signatures.find(s => s.step === 'PREPARER');

    const updated = await service.rejectObjectives(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    });

    for (const authId of [updated.reviewerUserId, updated.approverUserId].filter(Boolean) as string[]) {
      const u = await getUserSnapshot(authId);
      if (!u?.email) continue;
      NotificationService.sendEmailOnce(
        `KPI:${id}:REJECTED:notify:${authId}`,
        () => sendKpiResultEmail({
          to: { name: u.name ?? '', email: u.email! },
          departmentName: updated.department,
          year: updated.yearly,
          status: 'REJECTED',
          actorName: session.user.name ?? '',
          kpiId: id,
          objectives: updated.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
          senderEmail: session.user.email ?? undefined,
        }),
        u.email,
        'KPI Rejected',
        authId,
        {
          title: "KPI ถูกปฏิเสธ",
          body: `KPI ${updated.department} ${updated.yearly}`,
          module: "KPI",
          resourceId: id,
          resourceType: "KPI",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    const preparerAuthId = (preparerSig as Record<string, unknown>)?.signerAuthUserId as string | null | undefined;
    if (preparerAuthId) {
      const preparer = await getUserSnapshot(preparerAuthId);
      if (preparer?.email) {
        NotificationService.sendEmailOnce(
          `KPI:${id}:REJECTED:preparer:${preparerAuthId}`,
          () => sendKpiRejectedPreparerEmail({
            to: { name: preparer.name ?? '', email: preparer.email! },
            departmentName: updated.department,
            year: updated.yearly,
            actorName: session.user.name ?? '',
            kpiId: id,
            objectives: updated.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
            senderEmail: session.user.email ?? undefined,
          }),
          preparer.email,
          'KPI Rejected - Preparer Notification',
          preparerAuthId,
          {
            title: "KPI ถูกปฏิเสธ",
            body: `KPI ${updated.department} ${updated.yearly}`,
            module: "KPI",
            resourceId: id,
            resourceType: "KPI",
          },
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    NotificationService.notifyDeptMembers(
      updated.department,
      session.user.accessToken,
      { title: 'KPI ถูกปฏิเสธ', body: `KPI ${updated.department} ${updated.yearly} ถูกปฏิเสธ`, module: 'KPI', resourceId: id, resourceType: 'KPI' },
    ).catch(() => {});

    return sendSuccess(updated, 'KPI rejected successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
