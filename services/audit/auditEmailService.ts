/**
 * Audit email templates.
 * All sends go through the Auth Center delegated mail proxy (same as carEmailService).
 */

import { logger } from "@/lib/logger";

interface MailAttachment {
  name: string;
  contentType: string;
  contentBytes: string; // base64
}

interface SendMailOpts {
  to: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  subject: string;
  bodyHtml: string;
  senderAccessToken?: string | null;
  attachments?: MailAttachment[];
}

async function sendMail(opts: SendMailOpts): Promise<void> {
  if (!opts.senderAccessToken) {
    logger.warn("[auditEmail] No Auth Center token — mail skipped", { subject: opts.subject });
    return;
  }
  const base = process.env.AUTH_CENTER_URL?.replace(/\/$/, "");
  if (!base) {
    logger.warn("[auditEmail] AUTH_CENTER_URL not set — mail skipped");
    return;
  }
  for (const recipient of opts.to) {
    const payload: Record<string, unknown> = {
      toEmail: recipient.email,
      toName: recipient.name,
      subject: opts.subject,
      htmlBody: opts.bodyHtml,
    };
    if (opts.cc?.length) payload.cc = opts.cc.map((r) => ({ email: r.email, name: r.name }));
    if (opts.attachments?.length) payload.attachments = opts.attachments;
    const res = await fetch(`${base}/api/auth/mail/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.senderAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Auth Center sendMail ${res.status}: ${text}`);
    }
  }
}

function esc(v: string) {
  return v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function getAppUrl(path: string) {
  return `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}${path}`;
}

function fmt(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function auditTypeLabel(t: string) {
  if (t === "INTERNAL") return "ภายใน / Internal";
  if (t === "EXTERNAL") return "ภายนอก / External";
  return t;
}

function auditRoleLabel(r: string) {
  if (r === "LEAD") return "หัวหน้าทีม";
  if (r === "OBSERVER") return "ผู้สังเกตการณ์";
  return "สมาชิก";
}

function auditMailLayout(opts: {
  titleTh: string; titleEn: string;
  facts: { labelTh: string; labelEn: string; value: string }[];
  detail?: string;
  sections?: string;
  actionLabelTh?: string; actionLabelEn?: string; actionUrl?: string;
}) {
  const rows = opts.facts.map((f) =>
    `<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;width:35%;background:#f8fafc"><div style="font-size:12px;font-weight:700;color:#0f172a">${esc(f.labelTh)}</div><div style="font-size:11px;color:#64748b">${esc(f.labelEn)}</div></td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0"><div style="font-size:13px;font-weight:600;color:#0f172a">${esc(f.value)}</div></td></tr>`
  ).join("");
  const action = opts.actionUrl
    ? `<div style="margin-top:20px"><a href="${esc(opts.actionUrl)}" style="display:inline-block;padding:12px 24px;background:#0f1059;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">${esc(opts.actionLabelTh ?? "เปิด")} / ${esc(opts.actionLabelEn ?? "Open")}</a></div>`
    : "";
  return `<div style="font-family:Segoe UI,Arial,sans-serif;padding:20px;background:#f8fafc"><div style="max-width:700px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)"><div style="padding:20px 24px;background:#0f1059;color:#fff"><div style="font-size:18px;font-weight:800">${esc(opts.titleTh)}</div><div style="font-size:14px;font-weight:600;opacity:.85;margin-top:2px">${esc(opts.titleEn)}</div></div><div style="padding:22px 24px"><table style="width:100%;border-collapse:collapse">${rows}</table>${opts.detail ? `<div style="margin-top:14px;padding:12px 14px;background:#f8fafc;border-radius:6px;font-size:13px;color:#334155;white-space:pre-wrap">${esc(opts.detail)}</div>` : ""}${opts.sections ?? ""}${action}</div><div style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">NDC Quality Management System</div></div></div>`;
}

// ─── Announcement ─────────────────────────────────────────────────────────────

export async function sendAuditAnnouncementEmail(opts: {
  recipients: { name: string; email: string }[];
  planTitle: string;
  auditNo: string;
  auditType?: string;
  startDate?: string | null;
  endDate?: string | null;
  scope?: string | null;
  departments?: { name: string | null; code?: string | null }[];
  auditors?: { name: string | null; role: string }[];
  message: string;
  planId: string;
  senderAccessToken?: string | null;
  attachments?: MailAttachment[];
}): Promise<void> {
  if (!opts.recipients.length) return;
  const url = getAppUrl(`/qms/audit/${opts.planId}`);

  const facts: { labelTh: string; labelEn: string; value: string }[] = [
    { labelTh: "หมายเลข", labelEn: "Audit No.", value: opts.auditNo },
    { labelTh: "หัวข้อ", labelEn: "Title", value: opts.planTitle },
  ];
  if (opts.auditType) facts.push({ labelTh: "ประเภท", labelEn: "Type", value: auditTypeLabel(opts.auditType) });
  if (opts.startDate || opts.endDate) {
    facts.push({ labelTh: "ช่วงเวลา", labelEn: "Period", value: `${fmt(opts.startDate)} – ${fmt(opts.endDate)}` });
  }

  let sections = "";

  if (opts.departments?.length) {
    const deptItems = opts.departments
      .filter((d) => d.name)
      .map((d) => `<li style="padding:4px 0;font-size:13px;color:#0f172a">${d.code ? `<span style="background:#e2e8f0;border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;margin-right:6px">${esc(d.code)}</span>` : ""}${esc(d.name ?? "")}</li>`)
      .join("");
    if (deptItems) {
      sections += `<div style="margin-top:16px"><div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">แผนกที่รับการตรวจสอบ / Audited Departments</div><ul style="margin:0;padding-left:16px">${deptItems}</ul></div>`;
    }
  }

  if (opts.auditors?.length) {
    const auditorItems = opts.auditors
      .filter((a) => a.name)
      .map((a) => `<li style="padding:4px 0;font-size:13px;color:#0f172a">${esc(a.name ?? "")} <span style="color:#64748b;font-size:11px">(${esc(auditRoleLabel(a.role))})</span></li>`)
      .join("");
    if (auditorItems) {
      sections += `<div style="margin-top:16px"><div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">ทีมผู้ตรวจสอบ / Audit Team</div><ul style="margin:0;padding-left:16px">${auditorItems}</ul></div>`;
    }
  }

  const detail = opts.scope ? `ขอบเขต: ${opts.scope}` : opts.message;
  const extraDetail = opts.scope
    ? `<div style="margin-top:14px;padding:12px 14px;background:#f8fafc;border-radius:6px;font-size:13px;color:#334155;white-space:pre-wrap">${esc(opts.message)}</div>` + sections
    : sections;

  await sendMail({
    to: opts.recipients,
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] แผนการตรวจสอบ ${opts.auditNo}: ${opts.planTitle}`,
    bodyHtml: auditMailLayout({
      titleTh: "แจ้งแผนการตรวจสอบ",
      titleEn: "Audit Plan Announcement",
      facts,
      detail,
      sections: extraDetail,
      actionLabelTh: "ดูแผนการตรวจสอบ",
      actionLabelEn: "View Audit Plan",
      actionUrl: url,
    }),
    attachments: opts.attachments,
  });
}

// ─── Schedule invite (dept contact) ──────────────────────────────────────────

export async function sendScheduleInviteEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  sessionTitle: string;
  departmentName: string;
  startAt: string;
  endAt: string;
  location?: string | null;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/audit/${opts.planId}`);
  const dateStr = `${fmt(opts.startAt)} — ${fmt(opts.endAt)}`;
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] กำหนดการตรวจสอบ ${opts.auditNo} — ${opts.departmentName}`,
    bodyHtml: auditMailLayout({
      titleTh: "กำหนดการตรวจสอบ (รอการยืนยัน)",
      titleEn: "Audit Schedule — Pending Confirmation",
      facts: [
        { labelTh: "หมายเลข", labelEn: "Audit No.", value: opts.auditNo },
        { labelTh: "แผน", labelEn: "Plan", value: opts.planTitle },
        { labelTh: "แผนก", labelEn: "Department", value: opts.departmentName },
        { labelTh: "วาระ", labelEn: "Session", value: opts.sessionTitle },
        { labelTh: "วันเวลา", labelEn: "Date/Time", value: dateStr },
        ...(opts.location ? [{ labelTh: "สถานที่", labelEn: "Location", value: opts.location }] : []),
      ],
      sections: `<div style="margin-top:14px;padding:12px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e">กรุณาเข้าสู่ระบบเพื่อยืนยันว่าท่านว่างในวันดังกล่าว หากไม่ว่างกรุณาแจ้งเหตุผลเพื่อให้ทีม QMS จัดการใหม่</div>`,
      actionLabelTh: "ยืนยันตาราง",
      actionLabelEn: "Confirm Schedule",
      actionUrl: url,
    }),
  });
}

// ─── Schedule status change (notify QMS/plan owner) ──────────────────────────

export async function sendScheduleStatusEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  sessionTitle: string;
  departmentName: string;
  status: "CONFIRMED" | "UNAVAILABLE";
  confirmedBy: string;
  reason?: string | null;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/audit/${opts.planId}`);
  const isConfirmed = opts.status === "CONFIRMED";
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] ${isConfirmed ? "ยืนยัน" : "ไม่ว่าง"} — ${opts.departmentName} — ${opts.auditNo}`,
    bodyHtml: auditMailLayout({
      titleTh: isConfirmed ? "แผนกยืนยันตาราง" : "แผนกแจ้งไม่ว่าง",
      titleEn: isConfirmed ? "Department Confirmed Schedule" : "Department Unavailable",
      facts: [
        { labelTh: "หมายเลข", labelEn: "Audit No.", value: opts.auditNo },
        { labelTh: "แผนก", labelEn: "Department", value: opts.departmentName },
        { labelTh: "วาระ", labelEn: "Session", value: opts.sessionTitle },
        { labelTh: "ยืนยันโดย", labelEn: "By", value: opts.confirmedBy },
        ...(opts.reason ? [{ labelTh: "เหตุผล", labelEn: "Reason", value: opts.reason }] : []),
      ],
      actionLabelTh: "ดูแผนการตรวจสอบ",
      actionLabelEn: "View Plan",
      actionUrl: url,
    }),
  });
}

// ─── Rejection ────────────────────────────────────────────────────────────────

export async function sendAuditRejectionEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  rejectedBy: string;
  rejectedRole: string;
  reason: string;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/audit/${opts.planId}`);
  const roleLabel = opts.rejectedRole === "APPROVER" ? "ผู้อนุมัติ" : "ผู้ตรวจสอบ";

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] แผนถูกส่งกลับแก้ไข — ${opts.auditNo}`,
    bodyHtml: auditMailLayout({
      titleTh: "แผนการตรวจสอบถูกส่งกลับแก้ไข",
      titleEn: "Audit Plan Returned for Revision",
      facts: [
        { labelTh: "หมายเลข", labelEn: "Audit No.", value: opts.auditNo },
        { labelTh: "หัวข้อ", labelEn: "Title", value: opts.planTitle },
        { labelTh: "ส่งกลับโดย", labelEn: "Returned by", value: `${opts.rejectedBy} (${roleLabel})` },
      ],
      detail: opts.reason,
      actionLabelTh: "แก้ไขแผน",
      actionLabelEn: "Edit Plan",
      actionUrl: url,
    }),
  });
}

// ─── Approved notification to reviewer ───────────────────────────────────────

export async function sendAuditApprovedEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  approverName: string;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/audit/${opts.planId}`);

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] แผนได้รับการอนุมัติ — ${opts.auditNo}`,
    bodyHtml: auditMailLayout({
      titleTh: "แผนการตรวจสอบได้รับการอนุมัติ",
      titleEn: "Audit Plan Approved",
      facts: [
        { labelTh: "หมายเลข", labelEn: "Audit No.", value: opts.auditNo },
        { labelTh: "หัวข้อ", labelEn: "Title", value: opts.planTitle },
        { labelTh: "อนุมัติโดย", labelEn: "Approved by", value: opts.approverName },
      ],
      actionLabelTh: "ดูแผนการตรวจสอบ",
      actionLabelEn: "View Audit Plan",
      actionUrl: url,
    }),
  });
}

// ─── Per-department schedule notification (after plan approval) ───────────────

export async function sendDeptScheduleApprovalEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  departmentName: string;
  sessionTitle: string;
  startAt: string;
  endAt: string;
  location?: string | null;
  leadAuditorName?: string | null;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/audit/plans/${opts.planId}`);
  const fmtDt = (iso: string) =>
    new Date(iso).toLocaleString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const facts: { labelTh: string; labelEn: string; value: string }[] = [
    { labelTh: "หมายเลข", labelEn: "Audit No.", value: opts.auditNo },
    { labelTh: "แผน", labelEn: "Plan", value: opts.planTitle },
    { labelTh: "แผนก", labelEn: "Department", value: opts.departmentName },
    { labelTh: "วาระ", labelEn: "Session", value: opts.sessionTitle },
    { labelTh: "เริ่ม", labelEn: "Start", value: fmtDt(opts.startAt) },
    { labelTh: "สิ้นสุด", labelEn: "End", value: fmtDt(opts.endAt) },
  ];
  if (opts.location) facts.push({ labelTh: "สถานที่", labelEn: "Location", value: opts.location });
  if (opts.leadAuditorName) facts.push({ labelTh: "หัวผู้ตรวจสอบ", labelEn: "Lead Auditor", value: opts.leadAuditorName });

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] แผนอนุมัติแล้ว — กำหนดตรวจสอบ ${opts.departmentName} — ${opts.auditNo}`,
    bodyHtml: auditMailLayout({
      titleTh: "แผนได้รับการอนุมัติ — กำหนดการตรวจสอบของแผนก",
      titleEn: "Plan Approved — Your Department Audit Schedule",
      facts,
      sections: `<div style="margin-top:14px;padding:12px 14px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e">กรุณาเข้าสู่ระบบเพื่อยืนยันความพร้อมในวันดังกล่าว หากไม่ว่างกรุณาแจ้งเหตุผลเพื่อให้ QMS จัดการใหม่</div>`,
      actionLabelTh: "ยืนยันตาราง",
      actionLabelEn: "Confirm Schedule",
      actionUrl: url,
    }),
  });
}

// ─── Checklist received (notify plan owner/QMS) ───────────────────────────────

export async function sendChecklistReceivedEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  departmentName: string;
  sessionTitle: string;
  submittedBy: string;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/audit/plans/${opts.planId}`);
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] ได้รับ Checklist — ${opts.departmentName} — ${opts.auditNo}`,
    bodyHtml: auditMailLayout({
      titleTh: "ได้รับ Checklist การตรวจสอบ",
      titleEn: "Audit Checklist Received",
      facts: [
        { labelTh: "หมายเลข", labelEn: "Audit No.", value: opts.auditNo },
        { labelTh: "แผน", labelEn: "Plan", value: opts.planTitle },
        { labelTh: "แผนก", labelEn: "Department", value: opts.departmentName },
        { labelTh: "วาระ", labelEn: "Session", value: opts.sessionTitle },
        { labelTh: "ส่งโดย", labelEn: "Submitted by", value: opts.submittedBy },
      ],
      actionLabelTh: "ดูแผนการตรวจสอบ",
      actionLabelEn: "View Plan",
      actionUrl: url,
    }),
  });
}

// ─── Appointment sign request ─────────────────────────────────────────────────

export async function sendAppointmentSignRequestEmail(opts: {
  to: { name: string; email: string };
  appointmentNo: string;
  title: string;
  signedRole: "REVIEWER" | "APPROVER";
  appointmentId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const rolePath = opts.signedRole === "APPROVER" ? "approver" : "reviewer";
  const url = getAppUrl(`/approve/audit/appointments/${opts.appointmentId}/${rolePath}`);
  const roleLabel = opts.signedRole === "APPROVER" ? "ผู้อนุมัติ" : "ผู้ตรวจสอบ";
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[QMS] ขอลายเซ็น ${opts.appointmentNo} — ${roleLabel}`,
    bodyHtml: auditMailLayout({
      titleTh: "ขอลายเซ็นประกาศแต่งตั้ง",
      titleEn: "Appointment Letter Sign Request",
      facts: [
        { labelTh: "เลขที่", labelEn: "No.", value: opts.appointmentNo },
        { labelTh: "ชื่อประกาศ", labelEn: "Title", value: opts.title },
        { labelTh: "บทบาท", labelEn: "Role", value: roleLabel },
      ],
      actionLabelTh: "ลงนาม",
      actionLabelEn: "Sign",
      actionUrl: url,
    }),
  });
}

// ─── Appointment published (full letter) ──────────────────────────────────────

export async function sendAppointmentPublishedEmail(opts: {
  recipients: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  appointmentNo: string;
  title: string;
  year: number;
  standards: string[];
  members: { name: string; role: string; department?: string | null; standards: string[] }[];
  approverName: string;
  appointmentId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  if (!opts.recipients.length && !opts.cc?.length) return;
  const url = getAppUrl(`/audit/appointments/${opts.appointmentId}`);
  const yearTh = opts.year;
  const yearEn = yearTh - 543;

  const standardsList = opts.standards
    .map((s) => `<li style="padding:3px 0;font-size:13px">${esc(s)}</li>`)
    .join("");

  const ROLE_LABELS: Record<string, string> = {
    LEAD_AUDITOR: "หัวหน้าทีมผู้ตรวจ (Lead Auditor)",
    AUDITOR: "ผู้ตรวจติดตาม (Internal Auditor)",
    COMMITTEE: "คณะทำงาน (Working Committee)",
    SECRETARY: "เลขานุการ (Secretary)",
    ADVISOR: "ที่ปรึกษา (Advisor)",
  };

  const memberRows = opts.members
    .map(
      (m, i) =>
        `<tr style="${i % 2 === 0 ? "background:#f8fafc" : ""}">
      <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #e2e8f0">${i + 1}</td>
      <td style="padding:8px 12px;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0">${esc(m.name)}</td>
      <td style="padding:8px 12px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0">${esc(m.department ?? "")}</td>
      <td style="padding:8px 12px;font-size:12px;border-bottom:1px solid #e2e8f0">${esc(ROLE_LABELS[m.role] ?? m.role)}</td>
      <td style="padding:8px 12px;font-size:11px;color:#64748b;border-bottom:1px solid #e2e8f0">${m.standards.map(esc).join(", ") || "-"}</td>
    </tr>`
    )
    .join("");

  const bodyHtml = `
<div style="font-family:Segoe UI,Arial,sans-serif;padding:20px;background:#f8fafc">
<div style="max-width:760px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
  <div style="padding:20px 24px;background:#0f1059;color:#fff">
    <div style="font-size:16px;font-weight:800">ประกาศแต่งตั้งผู้ตรวจติดตามภายในและคณะทำงานระบบ ISO ประจำปี ${yearTh}</div>
    <div style="font-size:13px;font-weight:600;opacity:.85;margin-top:4px">Appointment of Internal Auditors and ISO Working Committee for ${yearEn}</div>
    <div style="font-size:12px;opacity:.65;margin-top:4px">เลขที่ ${esc(opts.appointmentNo)}</div>
  </div>
  <div style="padding:24px">
    <p style="font-size:14px;color:#0f172a;margin:0 0 12px">เรียน ผู้จัดการ / หัวหน้าทุกหน่วยงาน และพนักงานทุกท่าน<br><span style="color:#64748b">Dear Department Managers and All Employees,</span></p>
    <p style="font-size:13px;color:#334155;line-height:1.7;margin:0 0 12px">เพื่อให้การดำเนินงานระบบบริหารขององค์กรเป็นไปอย่างมีประสิทธิภาพ และสอดคล้องตามข้อกำหนดมาตรฐานสากล<br><span style="color:#64748b;font-size:12px">To ensure the effective implementation and continuous improvement of the company's management systems in accordance with international standards,</span></p>
    <p style="font-size:13px;color:#334155;line-height:1.7;margin:0 0 16px">บริษัทฯ ขอประกาศแต่งตั้ง ผู้ตรวจติดตามภายใน (Internal Auditors) และคณะทำงานระบบ ISO ประจำปี ${yearTh} สำหรับมาตรฐานดังต่อไปนี้<br><span style="color:#64748b;font-size:12px">The Company hereby announces the appointment of Internal Auditors and the ISO Working Committee for the year ${yearEn} covering the following standards:</span></p>
    ${standardsList ? `<ul style="margin:0 0 20px;padding-left:20px">${standardsList}</ul>` : ""}
    <div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:8px">รายชื่อคณะทำงาน / Appointed Members</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#0f1059;color:#fff">
            <th style="padding:10px 12px;font-size:12px;text-align:left;width:40px">#</th>
            <th style="padding:10px 12px;font-size:12px;text-align:left">ชื่อ-สกุล</th>
            <th style="padding:10px 12px;font-size:12px;text-align:left">หน่วยงาน</th>
            <th style="padding:10px 12px;font-size:12px;text-align:left">บทบาท</th>
            <th style="padding:10px 12px;font-size:12px;text-align:left">มาตรฐาน</th>
          </tr>
        </thead>
        <tbody>${memberRows}</tbody>
      </table>
    </div>
    <p style="font-size:13px;color:#334155;line-height:1.7;margin:0 0 8px">รายชื่อและหน้าที่รับผิดชอบในการเป็นผู้ตรวจติดตามภายใน และคณะทำงาน มีหน้าที่และความรับผิดชอบ ตามรายละเอียดประกาศที่แนบมานี้</p>
    <p style="font-size:13px;color:#334155;line-height:1.7;margin:0 0 8px">จึงประกาศมาเพื่อทราบ และขอความร่วมมือจากทุกหน่วยงานในการสนับสนุนการดำเนินงานของคณะผู้ตรวจติดตามและคณะทำงานดังกล่าว</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 20px">Thank you for your cooperation. / ขอขอบคุณสำหรับความร่วมมือด้วยดีเสมอมา</p>
    <div style="margin-top:20px">
      <a href="${esc(url)}" style="display:inline-block;padding:12px 24px;background:#0f1059;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">ดูประกาศ / View Announcement</a>
    </div>
  </div>
  <div style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">NDC Quality Management System · อนุมัติโดย ${esc(opts.approverName)}</div>
</div>
</div>`;

  await sendMail({
    to: opts.recipients,
    cc: opts.cc?.length ? opts.cc : undefined,
    senderAccessToken: opts.senderAccessToken,
    subject: `[QMS] ประกาศแต่งตั้งผู้ตรวจติดตามภายใน ประจำปี ${yearTh} — ${opts.appointmentNo}`,
    bodyHtml,
  });
}

// ─── Appointment rejected (back to owner) ────────────────────────────────────

export async function sendAppointmentRejectedEmail(opts: {
  to: { name: string; email: string };
  appointmentNo: string;
  title: string;
  reason: string;
  rejectedByRole: "REVIEWER" | "APPROVER";
  appointmentId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/audit/appointments/${opts.appointmentId}`);
  const roleLabel = opts.rejectedByRole === "APPROVER" ? "ผู้อนุมัติ" : "ผู้ตรวจสอบ";
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[QMS] ประกาศถูกส่งคืน ${opts.appointmentNo}`,
    bodyHtml: auditMailLayout({
      titleTh: "ประกาศถูกส่งคืนเพื่อแก้ไข",
      titleEn: "Appointment Letter Returned for Revision",
      facts: [
        { labelTh: "เลขที่", labelEn: "No.", value: opts.appointmentNo },
        { labelTh: "ชื่อประกาศ", labelEn: "Title", value: opts.title },
        { labelTh: "ส่งคืนโดย", labelEn: "Returned by", value: roleLabel },
        { labelTh: "เหตุผล", labelEn: "Reason", value: opts.reason },
      ],
      actionLabelTh: "แก้ไข", actionLabelEn: "Revise", actionUrl: url,
    }),
  });
}

// ─── Sign Request ─────────────────────────────────────────────────────────────

export async function sendAuditSignRequestEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  signedRole: string;
  token: string;
  planId: string;
  senderAccessToken?: string | null;
}) {
  // Route directly to the approve page based on role
  const rolePath = opts.signedRole === "APPROVER" ? "approver" : "reviewer";
  const url = getAppUrl(`/approve/audit/${opts.planId}/${rolePath}`);
  const roleLabel = opts.signedRole === "APPROVER" ? "ผู้อนุมัติ" : opts.signedRole === "REVIEWER" ? "ผู้ตรวจสอบ" : opts.signedRole;

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] ขอลายเซ็น ${opts.auditNo} — ${roleLabel}`,
    bodyHtml: auditMailLayout({
      titleTh: "ขอลายเซ็นแผนการตรวจสอบ",
      titleEn: "Audit Plan Sign Request",
      facts: [
        { labelTh: "หมายเลข", labelEn: "Audit No.", value: opts.auditNo },
        { labelTh: "หัวข้อ", labelEn: "Title", value: opts.planTitle },
        { labelTh: "บทบาท", labelEn: "Role", value: roleLabel },
      ],
      actionLabelTh: "ลงนามแผน",
      actionLabelEn: "Sign Plan",
      actionUrl: url,
    }),
  });
}
