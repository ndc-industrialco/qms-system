import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AuditPlanService } from "@/services/audit/auditPlanService";
import { QmsConfigService } from "@/services/qmsConfigService";
import AuditPlanPrintTemplate from "@/components/audit/AuditPlanPrintTemplate";
import type { AuditPlanDetail } from "@/types/audit";

const auditPlanService = new AuditPlanService();
const qmsConfigService = new QmsConfigService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const [plan, config] = await Promise.all([
    auditPlanService.getPlanById(id).catch(() => null),
    qmsConfigService.getSingleFooterConfig("AUDIT_PLAN"),
  ]);

  const label = config.label.trim() || "Audit Plan";
  return {
    title: plan?.auditNo ? `${plan.auditNo} - ${label}` : label,
  };
}

export default async function PrintAuditPlanPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  let plan;
  try {
    plan = await auditPlanService.getPlanById(id);
  } catch {
    notFound();
  }

  const [planConfig, auditorConfig] = await Promise.all([
    qmsConfigService.getSingleFooterConfig("AUDIT_PLAN"),
    qmsConfigService.getSingleFooterConfig("AUDITOR"),
  ]);

  const serialized: AuditPlanDetail = {
    ...plan,
    startDate: plan.startDate instanceof Date ? plan.startDate.toISOString() : (plan.startDate ?? null),
    endDate: plan.endDate instanceof Date ? plan.endDate.toISOString() : (plan.endDate ?? null),
    createdAt: plan.createdAt instanceof Date ? plan.createdAt.toISOString() : plan.createdAt,
    updatedAt: plan.updatedAt instanceof Date ? plan.updatedAt.toISOString() : plan.updatedAt,
    appointmentId: plan.appointmentId ?? null,
    departments: plan.departments.map((department) => ({
      id: department.id,
      departmentId: department.departmentId,
      departmentCode: department.departmentCode ?? null,
      departmentName: department.departmentName ?? null,
    })),
    auditors: plan.auditors.map((auditor) => ({
      id: auditor.id,
      assigneeAuthUserId: auditor.assigneeAuthUserId,
      assigneeNameSnapshot: auditor.assigneeNameSnapshot ?? null,
      assigneeEmailSnapshot: auditor.assigneeEmailSnapshot ?? null,
      role: auditor.role,
    })),
    schedules: plan.schedules.map((schedule) => ({
      id: schedule.id,
      planId: schedule.planId,
      sessionTitle: schedule.sessionTitle,
      location: schedule.location ?? null,
      agenda: schedule.agenda ?? null,
      startAt: schedule.startAt instanceof Date ? schedule.startAt.toISOString() : schedule.startAt,
      endAt: schedule.endAt instanceof Date ? schedule.endAt.toISOString() : schedule.endAt,
      departmentId: schedule.departmentId ?? null,
      departmentName: schedule.departmentName ?? null,
      contactEmail: schedule.contactEmail ?? null,
      confirmStatus: schedule.confirmStatus ?? "PENDING",
      unavailableReason: schedule.unavailableReason ?? null,
      confirmedAt: schedule.confirmedAt instanceof Date ? schedule.confirmedAt.toISOString() : (schedule.confirmedAt ?? null),
      confirmedByName: schedule.confirmedByName ?? null,
      leadAuditorAuthUserId: schedule.leadAuditorAuthUserId ?? null,
      leadAuditorNameSnapshot: schedule.leadAuditorNameSnapshot ?? null,
      leadAuditorEmailSnapshot: schedule.leadAuditorEmailSnapshot ?? null,
      checklistDueAt: schedule.checklistDueAt instanceof Date ? schedule.checklistDueAt.toISOString() : (schedule.checklistDueAt ?? null),
      checklistSubmittedAt: schedule.checklistSubmittedAt instanceof Date ? schedule.checklistSubmittedAt.toISOString() : (schedule.checklistSubmittedAt ?? null),
      checklistSubmittedByName: schedule.checklistSubmittedByName ?? null,
      auditeeNotifyDept: schedule.auditeeNotifyDept,
      team: (schedule as { team?: { id: string; authUserId: string; nameSnapshot: string | null; emailSnapshot: string | null; role: AuditPlanDetail["schedules"][number]["team"][number]["role"] }[] }).team?.map((member) => ({
        id: member.id,
        authUserId: member.authUserId,
        nameSnapshot: member.nameSnapshot ?? null,
        emailSnapshot: member.emailSnapshot ?? null,
        role: member.role,
      })) ?? [],
    })),
    announcements: plan.announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      message: announcement.message ?? null,
      deliveryMode: announcement.deliveryMode ?? null,
      publishedAt: announcement.publishedAt instanceof Date ? announcement.publishedAt.toISOString() : (announcement.publishedAt ?? ""),
    })),
    findings: plan.findings.map((finding) => ({
      id: finding.id,
      planId: finding.planId,
      findingNo: finding.findingNo,
      departmentId: finding.departmentId ?? null,
      category: finding.category,
      severity: finding.severity,
      clause: finding.clause ?? null,
      title: finding.title,
      detail: finding.detail,
      evidenceSummary: finding.evidenceSummary ?? null,
      ownerAuthUserId: finding.ownerAuthUserId ?? null,
      ownerNameSnapshot: finding.ownerNameSnapshot ?? null,
      status: finding.status,
      dueAt: finding.dueAt instanceof Date ? finding.dueAt.toISOString() : (finding.dueAt ?? null),
      createdAt: finding.createdAt instanceof Date ? finding.createdAt.toISOString() : finding.createdAt,
      updatedAt: finding.updatedAt instanceof Date ? finding.updatedAt.toISOString() : finding.updatedAt,
    })),
    signoffs: plan.signoffs.map((signoff) => ({
      id: signoff.id,
      signerAuthUserId: signoff.signedByAuthUserId,
      signerNameSnapshot: (signoff as { signerNameSnapshot?: string | null }).signerNameSnapshot ?? null,
      signedRole: signoff.signedRole,
      signedAt: signoff.signedAt instanceof Date ? signoff.signedAt.toISOString() : signoff.signedAt,
    })),
    report: plan.report
      ? {
          id: plan.report.id,
          reportNo: plan.report.id,
          summary: plan.report.summary ?? null,
          conclusion: plan.report.conclusion ?? null,
          generatedAt: plan.report.generatedAt instanceof Date ? plan.report.generatedAt.toISOString() : (plan.report.generatedAt ?? ""),
          pdfFileUrl: plan.report.pdfFileUrl ?? null,
        }
      : null,
  };

  return (
    <AuditPlanPrintTemplate
      plan={serialized}
      planConfig={planConfig}
      auditorConfig={auditorConfig}
    />
  );
}
