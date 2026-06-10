# NOTIFICATION Domain Overview

**Purpose:** จัดการการส่งอีเมลทั้งหมดในระบบ — idempotent, บันทึก log, ป้องกัน duplicate  
**Status:** COMPLETE (core engine) — บาง event ยังไม่ implement (Announcement, Doc Control)

---

## Architecture

```
Business Service (e.g. carService)
  └─> NotificationService.sendEmailOnce(key, fn, recipient, subject)
        ├─> ตรวจ NotificationLog (key already SENT? → skip)
        ├─> mark PENDING
        ├─> เรียก sendFn() → email.ts → MS Graph API
        └─> mark SENT หรือ FAILED
```

---

## Idempotency Key Convention

```
{RESOURCE_TYPE}:{resourceId}:{EVENT}:{recipientId}
```

ตัวอย่าง:
```
KPI:abc123:SUBMITTED:reviewer:user456
CAR:car-uuid:ISSUED:dept-group@company.com
DAR:dar-uuid:APPROVED:approver:user789
```

- ถ้า key เดิมถูก SENT แล้ว → skip ทันที (ไม่ส่งซ้ำ)
- ถ้า key เป็น PENDING หรือ FAILED → retry

---

## Email Events ที่ implement แล้ว

| Module | Event | Function | ผู้รับ |
|--------|-------|----------|--------|
| DAR | Reviewer Assigned | `sendReviewerAssignedEmail` | Reviewer |
| DAR | MR Approval Request | `sendMrApprovalRequestEmail` | MR |
| DAR | QMS Approval Request | `sendQmsApprovalRequestEmail` | QMS |
| DAR | Approved / Rejected | `sendApprovalNotificationEmail` / `sendRejectionEmail` | Preparer |
| KPI | Objective Reviewer Assigned | `sendKpiObjectiveReviewerAssignedEmail` | Reviewer |
| KPI | Objective Approver Request | `sendKpiObjectiveApproverRequestEmail` | Approver |
| KPI | Approval Request | `sendKpiApprovalRequestEmail` | Approver |
| KPI | Result (Approved/Rejected) | `sendKpiResultEmail` | Preparer |
| KPI | Recall | `sendKpiRecallEmail` | Reviewer/Approver |
| KPI | Rejected to Preparer | `sendKpiRejectedPreparerEmail` | Preparer |
| KPI Monthly | Approval Request | `sendKpiMonthlyApprovalRequestEmail` | Approver |
| KPI Monthly | Result | `sendKpiMonthlyResultEmail` | Preparer |
| CAR | Issued | `sendCarIssuedEmail` | แผนก (Email Group) |
| CAR | Reminder | `sendCarReminderEmail` | แผนก |
| CAR | Responded | `sendCarRespondedEmail` | MR + QMS |
| CAR | Verify Pass (MR Sign) | `sendCarVerifyPassEmail` | MR |
| CAR | Verify 2 Notify | `sendCarVerify2NotifyEmail` | แผนก |
| CAR | Re-CAR | `sendCarReCarEmail` | แผนก |

---

## Email Events ที่ยังต้อง Implement

| Module | Event | ผู้รับ |
|--------|-------|--------|
| Announcement | Publish | ทุกคนในองค์กร (MS Graph group) |
| Document Control | Approval status change | Reviewer / Approver |
| CAR | Reminder ทุก 3 วัน (Redis Job) | แผนก (อัตโนมัติ) |
| Internal Audit | Scheduled / Finding added | Auditee / QMS |

---

## Email Template Design

- **Engine:** MS Graph sendMail (app-only, ส่งจาก service account)
- **Format:** HTML bilingual (Thai/English)
- **Header:** Dark blue (#0F1059), white text, branded
- **Body:** Facts table, detail section, CTA button (action link)
- **Helper:** `makeBilingualMail()` — generate HTML template

---

## NotificationLog (ประวัติการส่ง)

| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | UUID | PK |
| `idempotencyKey` | String | UNIQUE |
| `channel` | String | EMAIL / PUSH |
| `status` | String | PENDING / SENT / FAILED |
| `recipient` | String | email address |
| `subject` | String | หัวข้อเมล |
| `errorMessage` | String? | ถ้า FAILED |
| `attempts` | Int | จำนวนครั้งที่พยายาม |
| `sentAt` | DateTime? | เวลาที่ส่งสำเร็จ |
| `createdAt` | DateTime | |

**Indexes:** `status`, `createdAt`

---

For detailed specs, see:
- [api.md](./api.md)
- [database.md](./database.md)
