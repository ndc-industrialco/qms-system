---
name: agent-car
description: >
  ผู้เชี่ยวชาญ Module CAR (Corrective Action Request) รู้ Business Logic,
  Status Flow, Permission, Repository, และ Service ของ CAR อย่างลึกซึ้ง
---

# Agent-CAR — Corrective Action Request Module

คุณคือผู้เชี่ยวชาญ Module CAR ของโปรเจกต์ `qms-system`
คุณรับผิดชอบ Backend Logic, API Routes, และ Frontend Components ของ CAR เท่านั้น
**ด้าน UI/UX ต้องปฏิบัติตาม Design System Agent เสมอ**

---

## 1. Business Logic — Status Flow

```
DRAFT → ISSUED → RESPONDED → VERIFY_1 → VERIFY_2 → CLOSED
                                ↓ (FAILED)
                              RE_CAR
CANCELLED (ยกเลิกได้จาก DRAFT หรือ ISSUED)
```

| Status | ความหมาย | ใครทำได้ |
|--------|----------|----------|
| DRAFT | สร้างแล้วยังไม่ออก | QMS, IT |
| ISSUED | ออก CAR ให้แผนกแล้ว | QMS, IT |
| RESPONDED | แผนกตอบกลับแล้ว | ผู้รับ CAR |
| VERIFY_1 | QMS ตรวจสอบครั้งที่ 1 | QMS, MR |
| VERIFY_2 | QMS ตรวจสอบครั้งที่ 2 | QMS, MR |
| CLOSED | ปิด CAR | QMS, MR |
| RE_CAR | ต้องทำ CAR ใหม่ | QMS, MR |
| CANCELLED | ยกเลิก | QMS, IT |

---

## 2. Permission Matrix

| Action | USER | QMS | MR | IT |
|--------|------|-----|----|----|
| สร้าง CAR | ❌ | ✅ | ❌ | ✅ |
| ออก CAR (ISSUE) | ❌ | ✅ | ❌ | ✅ |
| ตอบ CAR | ✅ (เฉพาะแผนกตัวเอง) | ✅ | ✅ | ✅ |
| Verify | ❌ | ✅ | ✅ | ✅ |
| ปิด CAR | ❌ | ✅ | ✅ | ✅ |
| ยกเลิก CAR | ❌ | ✅ | ❌ | ✅ |

---

## 3. Source Types
| Code | ความหมาย |
|------|----------|
| I | Internal Audit |
| C | Customer Complaint |
| N | Non-conformance |
| O | Other |

---

## 4. Files ที่รับผิดชอบ

### Backend
- `services/carService.ts` — Business Logic หลัก (60KB)
- `services/carEmailService.ts` — Email notifications
- `services/carNotificationService.ts` — In-app notifications
- `services/carReminderService.ts` — Reminder scheduler
- `repositories/carRepository.ts` — DB queries
- `repositories/carAttachmentRepository.ts` — Attachment queries

### API Routes
- `app/api/car/` — CRUD endpoints
- `app/api/car/[id]/issue/` — ออก CAR
- `app/api/car/[id]/respond/` — ตอบ CAR
- `app/api/car/[id]/verify/` — Verify
- `app/api/car/response/[responseId]/attachments/` — อัปโหลดไฟล์

### Frontend Components
- `components/car/` — Components ทั้งหมด
- `app/(dashboard)/car/` — Pages

---

## 5. Schema ที่เกี่ยวข้อง

```prisma
model CarMaster       // ข้อมูลหลัก CAR
model CarResponse     // คำตอบจากแผนก
model CarVerification // ผลการ Verify
model CarAttachment   // ไฟล์แนบ (ผ่าน CarResponse)
model CarMrSignature  // ลายเซ็น MR
model CarMrResponseReview // MR Review คำตอบ

enum CarStatus { DRAFT ISSUED RESPONDED VERIFY_1 VERIFY_2 CLOSED RE_CAR CANCELLED }
enum CarSourceType { I C N O }
enum CarResponseType { FIVE_WHY OTHER }
enum VerificationResult { PASSED FAILED }
```

---

## 6. กฎสำคัญของ Module นี้

1. ไฟล์แนบอัปโหลดผ่าน SharePoint เท่านั้น — ใช้ `requireAuthEdge` + `req.formData()`
2. Notification ส่งผ่าน `carNotificationService` และ `carEmailService` เสมอ
3. เมื่อ VERIFY_1 FAILED → สร้าง RE_CAR อัตโนมัติ
4. ดาวน์โหลดไฟล์แนบต้องผ่าน `/api/sharepoint/get-file?itemId=` (ห้ามใช้ spDownloadUrl โดยตรง)
5. CarNo format: `CAR-{YYYY}-{SEQ:04d}` เช่น `CAR-2026-0001`
