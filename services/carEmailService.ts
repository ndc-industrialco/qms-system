import { logger } from "@/lib/logger";
import { getGraphToken } from "@/lib/graph-token";
import { graphFetch } from "@/lib/graphFetch";

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getAppUrl(path: string): string {
  const base = (process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function sendMail(opts: { to: string; subject: string; bodyHtml: string }): Promise<void> {
  const sender = process.env.MAIL_SENDER;
  if (!sender) {
    logger.warn("[carEmail] No MAIL_SENDER configured — mail skipped", { subject: opts.subject });
    return;
  }
  const token = await getGraphToken();
  const payload = {
    message: {
      subject: opts.subject,
      body: { contentType: "HTML", content: opts.bodyHtml },
      toRecipients: [{ emailAddress: { address: opts.to } }],
    },
    saveToSentItems: false,
  };
  const res = await graphFetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph sendMail ${res.status}: ${text}`);
  }
}

function makeCarMailBody(opts: {
  titleTh: string;
  titleEn: string;
  carNo: string;
  bodyLines: string[];
  actionLabel?: string;
  actionUrl?: string;
}): string {
  const linesHtml = opts.bodyLines.map((l) => `<p style="margin:6px 0;font-size:13px;color:#334155">${esc(l)}</p>`).join("");
  const actionHtml = opts.actionUrl
    ? `<div style="margin-top:18px"><a href="${opts.actionUrl}" style="display:inline-block;padding:12px 20px;background:#0f1059;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">${esc(opts.actionLabel ?? "เปิดรายการ")}</a><div style="margin-top:8px;font-size:11px;color:#64748b;word-break:break-all">${esc(opts.actionUrl)}</div></div>`
    : "";
  return `
<div style="width:100%;margin:0;padding:20px;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif">
  <div style="max-width:680px;margin:0 auto;background:#fff;overflow:hidden;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
    <div style="padding:18px 22px;background:#0f1059;color:#fff">
      <div style="font-size:20px;font-weight:800">${esc(opts.titleTh)}</div>
      <div style="font-size:15px;opacity:.9">${esc(opts.titleEn)}</div>
      <div style="margin-top:6px;font-size:13px;background:rgba(255,255,255,.15);display:inline-block;padding:3px 10px;border-radius:4px;font-weight:700">${esc(opts.carNo)}</div>
    </div>
    <div style="padding:20px 22px">${linesHtml}${actionHtml}</div>
    <div style="padding:12px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b">อีเมลนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ / This is an automated email. Please do not reply.</div>
  </div>
</div>`;
}

export async function sendCarIssuedEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "แจ้งเตือน: ได้รับคำร้องขอแก้ไข (CAR)",
    titleEn: "Notice: Corrective Action Request Issued",
    carNo: opts.carNo,
    bodyLines: [
      `แผนกของท่านได้รับ CAR หมายเลข ${opts.carNo}`,
      "กรุณาดำเนินการตอบกลับภายใน 7 วัน",
      "Your department has received a Corrective Action Request. Please respond within 7 days.",
    ],
    actionLabel: "ดูรายละเอียด CAR / View CAR",
    actionUrl: url,
  });
  await sendMail({ to: opts.targetEmail, subject: `[CAR] ได้รับคำร้องขอแก้ไข ${opts.carNo}`, bodyHtml: html });
}

export async function sendCarReminderEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "เตือน: ยังไม่ได้ตอบกลับ CAR",
    titleEn: "Reminder: CAR Response Pending",
    carNo: opts.carNo,
    bodyLines: [
      `CAR หมายเลข ${opts.carNo} ยังรอการตอบกลับจากแผนกของท่าน`,
      "กรุณาดำเนินการโดยเร็วที่สุด",
      `CAR ${opts.carNo} is still awaiting your department's response. Please take action promptly.`,
    ],
    actionLabel: "ดูรายละเอียด CAR / View CAR",
    actionUrl: url,
  });
  await sendMail({ to: opts.targetEmail, subject: `[CAR Reminder] ยังไม่ได้ตอบกลับ ${opts.carNo}`, bodyHtml: html });
}

export async function sendCarRespondedEmail(opts: {
  carId: string;
  carNo: string;
  recipients: string[];
}): Promise<void> {
  const url = getAppUrl(`/qms/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "แจ้งเตือน: แผนกตอบกลับ CAR แล้ว",
    titleEn: "Notice: CAR Response Received",
    carNo: opts.carNo,
    bodyLines: [
      `CAR หมายเลข ${opts.carNo} ได้รับการตอบกลับจากแผนกแล้ว`,
      `CAR ${opts.carNo} has received a response from the department.`,
    ],
    actionLabel: "ดูรายละเอียด / View Details",
    actionUrl: url,
  });
  for (const to of opts.recipients) {
    await sendMail({ to, subject: `[CAR] แผนกตอบกลับ ${opts.carNo} แล้ว`, bodyHtml: html });
  }
}

export async function sendCarVerifyPassEmail(opts: {
  carId: string;
  carNo: string;
  mrEmail: string;
  token: string;
}): Promise<void> {
  const url = getAppUrl(`/approve/car/${opts.carId}/mr?token=${opts.token}`);
  const html = makeCarMailBody({
    titleTh: "แจ้งเตือน: CAR ผ่านการติดตาม — กรุณาลงนามปิด",
    titleEn: "Notice: CAR Passed Verification — Please Sign to Close",
    carNo: opts.carNo,
    bodyLines: [
      `CAR หมายเลข ${opts.carNo} ผ่านการติดตามผลการแก้ไขแล้ว`,
      "กรุณาลงนามเพื่อปิด CAR โดยคลิกที่ปุ่มด้านล่าง",
      `CAR ${opts.carNo} has passed verification. Please sign to close it.`,
    ],
    actionLabel: "ลงนามปิด CAR / Sign to Close CAR",
    actionUrl: url,
  });
  await sendMail({ to: opts.mrEmail, subject: `[CAR] กรุณาลงนามปิด CAR ${opts.carNo}`, bodyHtml: html });
}

export async function sendCarVerify2NotifyEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  nextDueDate: string;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "แจ้งเตือน: CAR ยังไม่ผ่านการติดตาม — มีการกำหนดวันติดตามครั้งที่ 2",
    titleEn: "Notice: CAR Failed Verification 1 — Verification 2 Scheduled",
    carNo: opts.carNo,
    bodyLines: [
      `CAR หมายเลข ${opts.carNo} ยังไม่ผ่านการติดตามผลครั้งที่ 1`,
      `กำหนดการติดตามครั้งที่ 2: ${opts.nextDueDate}`,
      `CAR ${opts.carNo} did not pass verification 1. Verification 2 is scheduled for ${opts.nextDueDate}.`,
    ],
    actionLabel: "ดูรายละเอียด CAR / View CAR",
    actionUrl: url,
  });
  await sendMail({ to: opts.targetEmail, subject: `[CAR] กำหนดการติดตามครั้งที่ 2 สำหรับ ${opts.carNo}`, bodyHtml: html });
}

export async function sendCarReCarEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  originalCarNo: string;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "แจ้งเตือน: ออก Re-CAR ใหม่",
    titleEn: "Notice: Re-CAR Issued",
    carNo: opts.carNo,
    bodyLines: [
      `มีการออก Re-CAR หมายเลข ${opts.carNo} (อ้างอิงจาก CAR ${opts.originalCarNo})`,
      "กรุณาดำเนินการตอบกลับภายใน 7 วัน",
      `A new Re-CAR ${opts.carNo} has been issued (referencing CAR ${opts.originalCarNo}). Please respond within 7 days.`,
    ],
    actionLabel: "ดูรายละเอียด Re-CAR / View Re-CAR",
    actionUrl: url,
  });
  await sendMail({ to: opts.targetEmail, subject: `[Re-CAR] ออก Re-CAR ใหม่ ${opts.carNo}`, bodyHtml: html });
}
