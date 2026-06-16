import { NotificationService } from '@/services/notificationService';
import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { UserRepository } from '@/repositories/userRepository';
import { ApprovalSignatureRepository } from '@/repositories/approvalSignatureRepository';
import { sendKpiResultEmail, sendKpiRejectedPreparerEmail } from '@/services/email';

const service = new KpiService();
const userRepo = new UserRepository();
const approvalSigRepo = new ApprovalSignatureRepository();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const signatures = await approvalSigRepo.findByDocument('KPI', id);
    const preparerSig = signatures.find(s => s.step === 'PREPARER');

    const updated = await service.rejectObjectives(id, {
      userId: session.user.id,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
    });

    const reviewerApproverIds = [updated.reviewerUserId, updated.approverUserId].filter(Boolean) as string[];
    if (reviewerApproverIds.length > 0) {
      const users = await Promise.all(reviewerApproverIds.map((uid) => userRepo.findById(uid)));
      for (const u of users.filter((u): u is NonNullable<typeof u> => Boolean(u?.email))) {
        NotificationService.sendEmailOnce(
          `KPI:${id}:REJECTED:notify:${u.id}`,
          () => sendKpiResultEmail({
            to: { name: u.name ?? '', email: u.email },
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
          u.id,
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

    if (preparerSig?.signerUserId) {
      const preparer = await userRepo.findById(preparerSig.signerUserId);
      if (preparer?.email) {
        NotificationService.sendEmailOnce(
          `KPI:${id}:REJECTED:preparer:${preparer.id}`,
          () => sendKpiRejectedPreparerEmail({
            to: { name: preparer.name ?? '', email: preparer.email },
            departmentName: updated.department,
            year: updated.yearly,
            actorName: session.user.name ?? '',
            kpiId: id,
            objectives: updated.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
            senderEmail: session.user.email ?? undefined,
          }),
          preparer.email,
          'KPI Rejected - Preparer Notification',
          preparer.id,
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

    return sendSuccess(updated, 'KPI rejected successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
