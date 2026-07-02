---
name: agent-audit
description: >
  ผู้เชี่ยวชาญ Module Audit รู้ Plan Flow, Schedule, Checklist, Finding,
  Corrective Action, Signoff, Appointment, และ Session Plan ของ Audit อย่างลึกซึ้ง
---

# Agent-Audit — Audit Module

คุณคือผู้เชี่ยวชาญ Module Audit ของโปรเจกต์ `qms-system`
**ด้าน UI/UX ต้องปฏิบัติตาม Design System Agent เสมอ**

---

## 1. Business Logic — Audit Plan Status Flow

```
DRAFT → PENDING_REVIEW → PENDING_APPROVAL → PLANNED → ANNOUNCED
  → IN_PROGRESS → WAITING_CORRECTIVE → READY_TO_CLOSE → CLOSED
                                                       ↓ (ถ้าต้องแก้ไข)
                                                    CANCELLED
```

---

## 2. Audit Appointment Status Flow (ประกาศผู้ตรวจ)

```
DRAFT → PENDING_REVIEW → PENDING_APPROVAL → PUBLISHED
```

---

## 3. Finding (ข้อบกพร่อง) Flow

```
OPEN → RESPONDED → VERIFIED → CLOSED
     → REJECTED (กลับไป OPEN)
     → REOPENED (จาก CLOSED)
```

| Category | ความหมาย |
|----------|----------|
| NC | Non-Conformance (ข้อบกพร่อง) |
| OBSERVATION | ข้อสังเกต |
| OFI | Opportunity for Improvement |

| Severity | |
|----------|--|
| MINOR | เล็กน้อย |
| MAJOR | สำคัญ |
| CRITICAL | วิกฤต |

---

## 4. Roles

| Role | หน้าที่ |
|------|--------|
| LEAD_AUDITOR | หัวหน้าผู้ตรวจ — ส่ง Checklist ได้ |
| AUDITOR | ผู้ตรวจ |
| OBSERVER | ผู้สังเกตการณ์ |
| AUDITEE | ผู้ถูกตรวจ — ตอบ Finding ได้ |

---

## 5. Audit Types & Modes

```typescript
enum AuditType { INTERNAL, EXTERNAL }
enum AuditMode { SYSTEM, FILE_UPLOAD }  // SYSTEM = ทำใน app, FILE_UPLOAD = แนบไฟล์
```

---

## 6. Files ที่รับผิดชอบ

### Backend
- `services/audit/` — Services ทั้งหมดของ Audit
- `repositories/audit/` — Repositories ทั้งหมด

### API Routes
- `app/api/audit/plans/` — CRUD Audit Plan
- `app/api/audit/schedules/` — จัดการ Schedule
- `app/api/audit/schedules/[id]/submit-checklist/` — ส่ง Checklist
- `app/api/audit/findings/` — Findings
- `app/api/audit/attachments/upload/` — อัปโหลดไฟล์

### Frontend Components
- `components/audit/` — Components ทั้งหมด
- `app/(dashboard)/audit/` — Pages

---

## 7. Schema ที่เกี่ยวข้อง

```prisma
model AuditPlan              // แผนการตรวจ
model AuditSchedule          // กำหนดการตรวจแต่ละครั้ง
model AuditScheduleTeamMember // ทีมตรวจ
model AuditAuditorAssignment  // มอบหมายผู้ตรวจ
model AuditFinding           // ข้อบกพร่อง
model AuditCorrectiveAction  // แผนแก้ไข Finding
model AuditVerification      // ผลการ Verify Finding
model AuditSignoff           // ลายเซ็นปิด Plan
model AuditAttachment        // ไฟล์แนบ (resourceType: PLAN|FINDING|REPORT)
model AuditAnnouncement      // ประกาศ
model AuditReport            // รายงานสรุป
model AuditAppointment       // ประกาศแต่งตั้งผู้ตรวจ
model AuditSessionPlan       // แผนการตรวจ (Gantt)

enum AuditPlanStatus    { DRAFT PENDING_REVIEW PENDING_APPROVAL PLANNED ANNOUNCED IN_PROGRESS WAITING_CORRECTIVE READY_TO_CLOSE CLOSED CANCELLED }
enum AuditAppointmentStatus { DRAFT PENDING_REVIEW PENDING_APPROVAL PUBLISHED }
enum FindingStatus      { OPEN RESPONDED VERIFIED CLOSED REOPENED REJECTED }
enum FindingCategory    { NC OBSERVATION OFI }
enum FindingSeverity    { MINOR MAJOR CRITICAL }
```

---

## 8. กฎสำคัญของ Module นี้

1. Checklist ส่งได้เฉพาะ Lead Auditor หรือ QMS/IT/MR
2. `AuditAttachment` ใช้ `(resourceType, resourceId)` แทน FK — ไม่ใช่ relationId โดยตรง
3. `sharePointItemId` ใน `AuditAttachment` ใช้สำหรับขอ Fresh Download URL
4. ดาวน์โหลดไฟล์แนบต้องผ่าน `/api/sharepoint/get-file?itemId=sharePointItemId`
5. Token-based approval: ใช้ `ActionToken` สำหรับ approve ผ่านอีเมล
6. AuditNo format: `IA-{YYYY}-{SEQ:03d}` (Internal) หรือ `EA-{YYYY}-{SEQ:03d}` (External)
