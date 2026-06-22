import { logger } from "@/lib/logger";

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

async function sendMail(opts: {
  to: string;
  cc?: string[];
  subject: string;
  bodyHtml: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  if (!opts.senderAccessToken) {
    logger.warn("[carEmail] No sender token - mail skipped", { subject: opts.subject, to: opts.to });
    return;
  }

  const base = process.env.AUTH_CENTER_URL?.replace(/\/$/, "");
  if (!base) {
    logger.warn("[carEmail] AUTH_CENTER_URL not set - mail skipped", { subject: opts.subject, to: opts.to });
    return;
  }

  const body: Record<string, unknown> = {
    toEmail: opts.to,
    subject: opts.subject,
    htmlBody: opts.bodyHtml,
    ...(opts.cc?.length ? { cc: opts.cc.map((email) => ({ email })) } : {}),
  };

  const res = await fetch(`${base}/api/auth/mail/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.senderAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center sendMail ${res.status}: ${text}`);
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
  const linesHtml = opts.bodyLines
    .map((line) => `<p style="margin:6px 0;font-size:13px;color:#334155">${esc(line)}</p>`)
    .join("");
  const actionHtml = opts.actionUrl
    ? `<div style="margin-top:18px"><a href="${opts.actionUrl}" style="display:inline-block;padding:12px 20px;background:#0f1059;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">${esc(opts.actionLabel ?? "Open Item")}</a><div style="margin-top:8px;font-size:11px;color:#64748b;word-break:break-all">${esc(opts.actionUrl)}</div></div>`
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
    <div style="padding:12px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b">This is an automated email. Please do not reply.</div>
  </div>
</div>`;
}

export async function sendCarIssuedEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  cc?: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "CAR issued",
    titleEn: "Corrective Action Request Issued",
    carNo: opts.carNo,
    bodyLines: [
      `Your department has received CAR ${opts.carNo}.`,
      "Please submit your response within 7 days.",
    ],
    actionLabel: "View CAR",
    actionUrl: url,
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[CAR] Issued ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

export async function sendCarReminderEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  cc?: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "CAR reminder",
    titleEn: "CAR Response Pending",
    carNo: opts.carNo,
    bodyLines: [
      `CAR ${opts.carNo} is still awaiting your department response.`,
      "Please take action as soon as possible.",
    ],
    actionLabel: "View CAR",
    actionUrl: url,
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[CAR Reminder] Pending response ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

export async function sendCarRespondedEmail(opts: {
  carId: string;
  carNo: string;
  recipients: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "CAR responded",
    titleEn: "CAR Response Received",
    carNo: opts.carNo,
    bodyLines: [
      `CAR ${opts.carNo} has received a response from the department.`,
    ],
    actionLabel: "View Details",
    actionUrl: url,
  });

  for (const to of opts.recipients) {
    await sendMail({
      to,
      subject: `[CAR] Response received ${opts.carNo}`,
      bodyHtml: html,
      senderAccessToken: opts.senderAccessToken,
    });
  }
}

export async function sendCarVerifyPassEmail(opts: {
  carId: string;
  carNo: string;
  mrEmail: string;
  token: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/approve/car/${opts.carId}/mr?token=${opts.token}`);
  const html = makeCarMailBody({
    titleTh: "CAR passed verification",
    titleEn: "Please sign to close CAR",
    carNo: opts.carNo,
    bodyLines: [
      `CAR ${opts.carNo} passed verification.`,
      "Please sign to close this CAR.",
    ],
    actionLabel: "Sign to Close CAR",
    actionUrl: url,
  });

  await sendMail({
    to: opts.mrEmail,
    subject: `[CAR] Sign to close ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

export async function sendCarVerify2NotifyEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  nextDueDate: string;
  cc?: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "Verification 2 scheduled",
    titleEn: "CAR failed verification 1",
    carNo: opts.carNo,
    bodyLines: [
      `CAR ${opts.carNo} did not pass verification 1.`,
      `Verification 2 is scheduled for ${opts.nextDueDate}.`,
    ],
    actionLabel: "View CAR",
    actionUrl: url,
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[CAR] Verification 2 scheduled ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

export async function sendCarMrReviewRequestEmail(opts: {
  carId: string;
  carNo: string;
  mrEmail: string;
  token: string;
  plannedCompletionDate: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const approveUrl = getAppUrl(`/approve/car/${opts.carId}/mr-response?token=${opts.token}&action=APPROVED`);
  const rejectUrl = getAppUrl(`/approve/car/${opts.carId}/mr-response?token=${opts.token}&action=REJECTED`);
  const viewUrl = getAppUrl(`/qms/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "MR review required",
    titleEn: "Review CAR corrective action plan",
    carNo: opts.carNo,
    bodyLines: [
      `CAR ${opts.carNo} has received a corrective action plan.`,
      `Planned completion date: ${opts.plannedCompletionDate}.`,
      "Please review and approve or reject the plan.",
    ],
    actionLabel: "View Plan",
    actionUrl: viewUrl,
  });
  const approveBtn = `<div style="margin-top:10px"><a href="${approveUrl}" style="display:inline-block;padding:10px 18px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700;margin-right:8px">Approve</a><a href="${rejectUrl}" style="display:inline-block;padding:10px 18px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">Reject</a></div>`;
  const fullHtml = html.replace("</div>\n    <div", `${approveBtn}\n    </div>\n    <div`);

  await sendMail({
    to: opts.mrEmail,
    subject: `[CAR] MR review required ${opts.carNo}`,
    bodyHtml: fullHtml,
    senderAccessToken: opts.senderAccessToken,
  });
}

export async function sendCarPlanApprovedEmail(opts: {
  carId: string;
  carNo: string;
  recipients: string[];
  cc?: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "Plan approved",
    titleEn: "CAR corrective action plan approved",
    carNo: opts.carNo,
    bodyLines: [
      `The corrective action plan for CAR ${opts.carNo} has been approved by MR.`,
      "Please proceed according to the approved plan.",
    ],
    actionLabel: "View CAR",
    actionUrl: url,
  });

  for (const to of opts.recipients) {
    await sendMail({
      to,
      cc: opts.cc,
      subject: `[CAR] Plan approved ${opts.carNo}`,
      bodyHtml: html,
      senderAccessToken: opts.senderAccessToken,
    });
  }
}

export async function sendCarPlanRejectedEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  comment?: string;
  cc?: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "Plan rejected",
    titleEn: "Please revise and resubmit",
    carNo: opts.carNo,
    bodyLines: [
      `The corrective action plan for CAR ${opts.carNo} was rejected by MR.`,
      ...(opts.comment ? [`Comment: ${opts.comment}`] : []),
      "Please revise and resubmit within 7 days.",
    ],
    actionLabel: "Revise Plan",
    actionUrl: url,
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[CAR] Plan rejected ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

export async function sendCarReCarEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  originalCarNo: string;
  cc?: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const html = makeCarMailBody({
    titleTh: "Re-CAR issued",
    titleEn: "New Re-CAR created",
    carNo: opts.carNo,
    bodyLines: [
      `A new Re-CAR ${opts.carNo} has been issued, referencing CAR ${opts.originalCarNo}.`,
      "Please submit your response within 7 days.",
    ],
    actionLabel: "View Re-CAR",
    actionUrl: url,
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[Re-CAR] Issued ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}
