/**
 * Microsoft Graph API — Send Mail (app-only)
 *
 * Required Azure AD application permission:
 *   - Mail.Send
 *
 * The "from" address must be a mailbox in the tenant.
 * Set MAIL_SENDER_ADDRESS to the shared/service mailbox (e.g. noreply@yourcompany.com).
 */

import { getGraphToken } from "@/lib/graph-token";


export interface MailRecipient {
  name: string;
  email: string;
}

interface SendMailOptions {
  to: MailRecipient[];
  subject: string;
  bodyHtml: string;
  /** Override sender mailbox. Falls back to MAIL_SENDER_ADDRESS env var. */
  senderEmail?: string;
}

async function sendMail(opts: SendMailOptions): Promise<void> {
  const sender = opts.senderEmail || process.env.MAIL_SENDER_ADDRESS;
  if (!sender) {
    console.warn("[email] No sender address — skipping mail send");
    return;
  }

  const token = await getGraphToken();

  const payload = {
    message: {
      subject: opts.subject,
      body: { contentType: "HTML", content: opts.bodyHtml },
      toRecipients: opts.to.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
    },
    saveToSentItems: false,
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph sendMail ${res.status}: ${text}`);
  }
}

// ── DAR email templates ───────────────────────────────────────────────────────

export interface DarEmailItem {
  itemNo: number;
  docNumber: string;
  docName: string;
  revision: string;
}

export interface DarEmailAttachment {
  fileName: string;
  spWebUrl: string;
}

export async function sendReviewerAssignedEmail(opts: {
  reviewer: MailRecipient;
  requesterName: string;
  requesterDepartment: string | null;
  darNo: string;
  darId: string;
  requestDate: string;
  objective: string;
  docType: string;
  reason: string;
  items: DarEmailItem[];
  attachments: DarEmailAttachment[];
  senderEmail?: string;
}): Promise<void> {
  const appUrl = process.env.NEXTAUTH_URL ?? "";
  const reviewUrl = `${appUrl}/dar/${opts.darId}/review`;

  const itemRows = opts.items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#374151;font-size:13px">${it.itemNo}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#374151;font-size:13px;font-family:monospace">${it.docNumber}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#374151;font-size:13px">${it.docName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#374151;font-size:13px;text-align:center">${it.revision}</td>
        </tr>`,
    )
    .join("");

  const attachmentList =
    opts.attachments.length > 0
      ? opts.attachments
          .map(
            (a) =>
              `<li style="margin-bottom:4px">
                <a href="${a.spWebUrl}" style="color:#0f1059;font-size:13px;text-decoration:underline">${a.fileName}</a>
              </li>`,
          )
          .join("")
      : `<li style="color:#9ca3af;font-size:13px">ไม่มีไฟล์แนบ</li>`;

  const requestDateFmt = new Date(opts.requestDate).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  await sendMail({
    to: [opts.reviewer],
    senderEmail: opts.senderEmail,
    subject: `[QMS] Document Request ${opts.darNo} — Pending Your Review / รอการตรวจสอบจากคุณ`,
    bodyHtml: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',sans-serif">
<div style="max-width:620px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">

  <!-- Header -->
  <div style="background:#0f1059;padding:28px 32px">
    <p style="margin:0;color:#a5b4fc;font-size:12px;letter-spacing:1px;text-transform:uppercase">QMS Document Request</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">${opts.darNo}</h1>
  </div>

  <!-- Alert banner -->
  <div style="background:#fffbeb;border-bottom:1px solid #fde68a;padding:14px 32px">
    <p style="margin:0;color:#92400e;font-size:13px;font-weight:600">
      You have been assigned to review a document request from <strong>${opts.requesterName}</strong>
    </p>
    <p style="margin:4px 0 0;color:#92400e;font-size:12px">
      คุณได้รับมอบหมายให้ตรวจสอบคำขอเอกสารจาก <strong>${opts.requesterName}</strong>
    </p>
  </div>

  <div style="padding:28px 32px">

    <!-- Request meta -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="padding:4px 0;width:50%;vertical-align:top">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Requested By / ผู้จัดทำ</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:600">${opts.requesterName}</p>
          ${opts.requesterDepartment ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280">${opts.requesterDepartment}</p>` : ""}
        </td>
        <td style="padding:4px 0;width:50%;vertical-align:top">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Request Date / วันที่ขอ</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111827">${requestDateFmt}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0 4px;vertical-align:top">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Objective / วัตถุประสงค์</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111827">${opts.objective}</p>
        </td>
        <td style="padding:12px 0 4px;vertical-align:top">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Document Type / ประเภทเอกสาร</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111827">${opts.docType}</p>
        </td>
      </tr>
    </table>

    <!-- Reason -->
    <div style="margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.5px">Reason / เหตุผล - ความจำเป็น</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #0f1059;border-radius:6px;padding:12px 16px">
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;white-space:pre-wrap">${opts.reason}</p>
      </div>
    </div>

    <!-- Items table -->
    <div style="margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.5px">Document Items / รายการเอกสาร (${opts.items.length})</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">#</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">Doc. No. / เลขที่เอกสาร</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">Document Name / ชื่อเอกสาร</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">Rev.</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <!-- Attachments -->
    <div style="margin-bottom:28px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.5px">Attachments / ไฟล์แนบ</p>
      <ul style="margin:0;padding-left:18px">${attachmentList}</ul>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:20px 0;border-top:1px solid #f1f5f9">
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Click the button below to review and sign off.</p>
      <p style="margin:0 0 16px;font-size:13px;color:#9ca3af">คลิกปุ่มด้านล่างเพื่อตรวจสอบและลงลายมือชื่อ</p>
      <a href="${reviewUrl}"
         style="display:inline-block;padding:12px 28px;background:#0f1059;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:.3px">
        Review and Approve / ตรวจสอบและอนุมัติ
      </a>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af">
        If the button does not work, open this link / หากปุ่มด้านบนไม่ทำงาน กรุณาเปิดลิงก์:<br>
        <a href="${reviewUrl}" style="color:#0f1059">${reviewUrl}</a>
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">This email was sent automatically by the QMS system. Please do not reply.</p>
    <p style="margin:4px 0 0;font-size:11px;color:#9ca3af">อีเมลนี้ส่งโดยระบบ QMS โดยอัตโนมัติ — กรุณาอย่าตอบกลับ</p>
  </div>

</div>
</body>
</html>`,
  });
}

export async function sendMrApprovalRequestEmail(opts: {
  mr: MailRecipient;
  reviewerName: string;
  requesterName: string;
  requesterDepartment: string | null;
  darNo: string;
  darId: string;
  requestDate: string;
  objective: string;
  docType: string;
  reason: string;
  items: DarEmailItem[];
  attachments: DarEmailAttachment[];
  senderEmail?: string;
}): Promise<void> {
  const appUrl = process.env.NEXTAUTH_URL ?? "";
  const darUrl = `${appUrl}/dar/${opts.darId}/review`;

  const itemRows = opts.items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#374151;font-size:13px">${it.itemNo}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#374151;font-size:13px;font-family:monospace">${it.docNumber}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#374151;font-size:13px">${it.docName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#374151;font-size:13px;text-align:center">${it.revision}</td>
        </tr>`,
    )
    .join("");

  const attachmentList =
    opts.attachments.length > 0
      ? opts.attachments
          .map(
            (a) =>
              `<li style="margin-bottom:4px">
                <a href="${a.spWebUrl}" style="color:#0f1059;font-size:13px;text-decoration:underline">${a.fileName}</a>
              </li>`,
          )
          .join("")
      : `<li style="color:#9ca3af;font-size:13px">ไม่มีไฟล์แนบ</li>`;

  const requestDateFmt = new Date(opts.requestDate).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  await sendMail({
    to: [opts.mr],
    senderEmail: opts.senderEmail,
    subject: `[QMS] Document Request ${opts.darNo} — Reviewed, Pending Final Approval / รออนุมัติขั้นสุดท้ายจากท่าน`,
    bodyHtml: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',sans-serif">
<div style="max-width:620px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">

  <!-- Header -->
  <div style="background:#0f1059;padding:28px 32px">
    <p style="margin:0;color:#a5b4fc;font-size:12px;letter-spacing:1px;text-transform:uppercase">QMS Document Request</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">${opts.darNo}</h1>
  </div>

  <!-- Alert banner -->
  <div style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;padding:14px 32px">
    <p style="margin:0;color:#166534;font-size:13px;font-weight:600">
      <strong>${opts.reviewerName}</strong> has reviewed and approved this request. Final approval from you is required.
    </p>
    <p style="margin:4px 0 0;color:#166534;font-size:12px">
      <strong>${opts.reviewerName}</strong> ได้ตรวจสอบและอนุมัติคำขอนี้แล้ว — รออนุมัติขั้นสุดท้ายจากท่าน
    </p>
  </div>

  <div style="padding:28px 32px">

    <!-- Request meta -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="padding:4px 0;width:50%;vertical-align:top">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Requested By / ผู้จัดทำ</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:600">${opts.requesterName}</p>
          ${opts.requesterDepartment ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280">${opts.requesterDepartment}</p>` : ""}
        </td>
        <td style="padding:4px 0;width:50%;vertical-align:top">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Request Date / วันที่ขอ</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111827">${requestDateFmt}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0 4px;vertical-align:top">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Objective / วัตถุประสงค์</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111827">${opts.objective}</p>
        </td>
        <td style="padding:12px 0 4px;vertical-align:top">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Document Type / ประเภทเอกสาร</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111827">${opts.docType}</p>
        </td>
      </tr>
    </table>

    <!-- Reason -->
    <div style="margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.5px">Reason / เหตุผล - ความจำเป็น</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #0f1059;border-radius:6px;padding:12px 16px">
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;white-space:pre-wrap">${opts.reason}</p>
      </div>
    </div>

    <!-- Items table -->
    <div style="margin-bottom:24px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.5px">Document Items / รายการเอกสาร (${opts.items.length})</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">#</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">Doc. No. / เลขที่เอกสาร</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">Document Name / ชื่อเอกสาร</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">Rev.</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <!-- Attachments -->
    <div style="margin-bottom:28px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.5px">Attachments / ไฟล์แนบ</p>
      <ul style="margin:0;padding-left:18px">${attachmentList}</ul>
    </div>

    <!-- CTA -->
    <div style="text-align:center;padding:20px 0;border-top:1px solid #f1f5f9">
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Click the button below to review and provide final approval.</p>
      <p style="margin:0 0 16px;font-size:13px;color:#9ca3af">คลิกปุ่มด้านล่างเพื่อตรวจสอบและอนุมัติขั้นสุดท้าย</p>
      <a href="${darUrl}"
         style="display:inline-block;padding:12px 28px;background:#0f1059;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:.3px">
        View and Approve / ดูและอนุมัติ
      </a>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af">
        If the button does not work, open this link / หากปุ่มด้านบนไม่ทำงาน กรุณาเปิดลิงก์:<br>
        <a href="${darUrl}" style="color:#0f1059">${darUrl}</a>
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">This email was sent automatically by the QMS system. Please do not reply.</p>
    <p style="margin:4px 0 0;font-size:11px;color:#9ca3af">อีเมลนี้ส่งโดยระบบ QMS โดยอัตโนมัติ — กรุณาอย่าตอบกลับ</p>
  </div>

</div>
</body>
</html>`,
  });
}

export async function sendApprovalNotificationEmail(opts: {
  to: MailRecipient;
  darNo: string;
  darId: string;
  approverName: string;
  stepLabel: string;
  nextStepLabel: string;
}): Promise<void> {
  const appUrl = process.env.NEXTAUTH_URL ?? "";
  const darUrl = `${appUrl}/dar/${opts.darId}`;

  await sendMail({
    to: [opts.to],
    subject: `[QMS] Document Request ${opts.darNo} — ${opts.stepLabel} Approved / ผ่านขั้นตอน${opts.stepLabel}แล้ว`,
    bodyHtml: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',sans-serif">
<div style="max-width:620px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">

  <!-- Header -->
  <div style="background:#0f1059;padding:28px 32px">
    <p style="margin:0;color:#a5b4fc;font-size:12px;letter-spacing:1px;text-transform:uppercase">QMS Document Request</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">${opts.darNo}</h1>
  </div>

  <!-- Alert banner -->
  <div style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;padding:14px 32px">
    <p style="margin:0;color:#166534;font-size:13px;font-weight:600">
      Step <strong>${opts.stepLabel}</strong> has been approved by <strong>${opts.approverName}</strong>.
    </p>
    <p style="margin:4px 0 0;color:#166534;font-size:12px">
      <strong>${opts.approverName}</strong> ได้อนุมัติขั้นตอน${opts.stepLabel} เรียบร้อยแล้ว
    </p>
  </div>

  <div style="padding:28px 32px">

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr>
        <td style="padding:4px 0;width:50%;vertical-align:top">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Approved Step / ขั้นตอนที่อนุมัติ</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:600">${opts.stepLabel}</p>
        </td>
        <td style="padding:4px 0;width:50%;vertical-align:top">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px">Next Step / ขั้นตอนถัดไป</p>
          <p style="margin:4px 0 0;font-size:14px;color:#111827;font-weight:600">${opts.nextStepLabel}</p>
        </td>
      </tr>
    </table>

    <div style="text-align:center;padding:20px 0;border-top:1px solid #f1f5f9">
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Click the button below to view the request status.</p>
      <p style="margin:0 0 16px;font-size:13px;color:#9ca3af">คลิกปุ่มด้านล่างเพื่อดูสถานะคำขอ</p>
      <a href="${darUrl}"
         style="display:inline-block;padding:12px 28px;background:#0f1059;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:.3px">
        View Request Status / ดูสถานะคำขอ
      </a>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af">
        If the button does not work, open this link / หากปุ่มด้านบนไม่ทำงาน กรุณาเปิดลิงก์:<br>
        <a href="${darUrl}" style="color:#0f1059">${darUrl}</a>
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">This email was sent automatically by the QMS system. Please do not reply.</p>
    <p style="margin:4px 0 0;font-size:11px;color:#9ca3af">อีเมลนี้ส่งโดยระบบ QMS โดยอัตโนมัติ — กรุณาอย่าตอบกลับ</p>
  </div>

</div>
</body>
</html>`,
  });
}

export async function sendRejectionEmail(opts: {
  to: MailRecipient;
  darNo: string;
  darId: string;
  rejectorName: string;
  reason: string;
}): Promise<void> {
  const appUrl = process.env.NEXTAUTH_URL ?? "";
  const darUrl = `${appUrl}/dar/${opts.darId}`;

  await sendMail({
    to: [opts.to],
    subject: `[QMS] Document Request ${opts.darNo} — Returned for Revision / ถูกส่งคืน`,
    bodyHtml: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',sans-serif">
<div style="max-width:620px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">

  <!-- Header -->
  <div style="background:#0f1059;padding:28px 32px">
    <p style="margin:0;color:#a5b4fc;font-size:12px;letter-spacing:1px;text-transform:uppercase">QMS Document Request</p>
    <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">${opts.darNo}</h1>
  </div>

  <!-- Alert banner -->
  <div style="background:#fef2f2;border-bottom:1px solid #fecaca;padding:14px 32px">
    <p style="margin:0;color:#991b1b;font-size:13px;font-weight:600">
      This request has been returned for revision by <strong>${opts.rejectorName}</strong>.
    </p>
    <p style="margin:4px 0 0;color:#991b1b;font-size:12px">
      <strong>${opts.rejectorName}</strong> ได้ส่งคืนคำขอนี้เพื่อแก้ไข
    </p>
  </div>

  <div style="padding:28px 32px">

    <!-- Reason -->
    <div style="margin-bottom:28px">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.5px">Reason for Return / เหตุผลที่ส่งคืน</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #dc2626;border-radius:6px;padding:12px 16px">
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;white-space:pre-wrap">${opts.reason}</p>
      </div>
    </div>

    <p style="margin:0 0 4px;font-size:14px;color:#374151">Please revise and resubmit the request.</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280">กรุณาแก้ไขและส่งใหม่อีกครั้ง</p>

    <div style="text-align:center;padding:20px 0;border-top:1px solid #f1f5f9">
      <a href="${darUrl}"
         style="display:inline-block;padding:12px 28px;background:#0f1059;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:.3px">
        View Request / ดูคำขอ
      </a>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af">
        If the button does not work, open this link / หากปุ่มด้านบนไม่ทำงาน กรุณาเปิดลิงก์:<br>
        <a href="${darUrl}" style="color:#0f1059">${darUrl}</a>
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">This email was sent automatically by the QMS system. Please do not reply.</p>
    <p style="margin:4px 0 0;font-size:11px;color:#9ca3af">อีเมลนี้ส่งโดยระบบ QMS โดยอัตโนมัติ — กรุณาอย่าตอบกลับ</p>
  </div>

</div>
</body>
</html>`,
  });
}

export async function sendKpiObjectiveReviewerAssignedEmail(opts: {
  reviewer: MailRecipient;
  requesterName: string;
  departmentName: string;
  objectiveId: string;
  objective: string;
  year: number;
}) {
  const appUrl = process.env.NEXTAUTH_URL ?? "";
  const url = `${appUrl}/qms/kpi`;
  await sendMail({
    to: [opts.reviewer],
    subject: `[KPI] Review Required - ${opts.departmentName} / ${opts.year}`,
    bodyHtml: `
      <p>Hello ${opts.reviewer.name},</p>
      <p>You have been assigned as KPI objective reviewer.</p>
      <p><strong>Department:</strong> ${opts.departmentName}</p>
      <p><strong>Objective:</strong> ${opts.objective}</p>
      <p><strong>Year:</strong> ${opts.year}</p>
      <p><a href="${url}">Open KPI Workflow</a></p>
      <hr />
      <p style="color:#666">Assigned by: ${opts.requesterName}</p>
    `,
  });
}

export async function sendKpiObjectiveApproverRequestEmail(opts: {
  approver: MailRecipient;
  reviewerName: string;
  departmentName: string;
  objective: string;
  year: number;
}) {
  const appUrl = process.env.NEXTAUTH_URL ?? "";
  const url = `${appUrl}/qms/kpi`;
  await sendMail({
    to: [opts.approver],
    subject: `[KPI] Final Approval Required - ${opts.departmentName} / ${opts.year}`,
    bodyHtml: `
      <p>Hello ${opts.approver.name},</p>
      <p>The KPI objective has been reviewed and is ready for final approval.</p>
      <p><strong>Department:</strong> ${opts.departmentName}</p>
      <p><strong>Objective:</strong> ${opts.objective}</p>
      <p><strong>Year:</strong> ${opts.year}</p>
      <p><strong>Reviewed by:</strong> ${opts.reviewerName}</p>
      <p><a href="${url}">Open KPI Workflow</a></p>
    `,
  });
}
