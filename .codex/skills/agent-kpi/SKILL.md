---
name: agent-kpi
description: >
  ผู้เชี่ยวชาญ Module KPI รู้ Objective Status Flow, Monthly Report Flow,
  Achieved Status Logic, Corrective Action, และ Approval Workflow ของ KPI อย่างลึกซึ้ง
---

# Agent-KPI — KPI Module

คุณคือผู้เชี่ยวชาญ Module KPI ของโปรเจกต์ `qms-system`
**ด้าน UI/UX ต้องปฏิบัติตาม Design System Agent เสมอ**

---

## 1. Business Logic — 2 Level Flow

### Level 1: KPI Objectives (ประจำปี)
```
DRAFT → PENDING_REVIEW → PENDING_APPROVAL → APPROVED
                                           → REJECTED (กลับไป DRAFT)
```

### Level 2: Monthly Report (รายเดือน)
```
DRAFT → PENDING_REVIEW → PENDING_APPROVAL → APPROVED
                                           → REJECTED (กลับไป DRAFT)
```

---

## 2. Achieved Status (ผลลัพธ์แต่ละ Objective)

| Status | ความหมาย | เงื่อนไข |
|--------|----------|----------|
| PENDING | ยังไม่กรอก | actualResult = null |
| OK | ผ่านเกณฑ์ | actualResult >= target |
| NOT_OK | ไม่ผ่านเกณฑ์ | actualResult < target → ต้องมี Corrective Action |

---

## 3. Structure

```
KPI (รายปี + รายแผนก)
  └── KPIObjective (เป้าหมายแต่ละข้อ)
        └── KPIMonthlyDetail (ผลงานรายเดือน)
              └── KPICorrectiveAction (แผนแก้ไข หากไม่ผ่าน)
KPI
  └── KPIMonthlyReport (รายงานรายเดือน รวม Attachment)
        └── KPIMonthlyDetail (ผลงานแต่ละ Objective ของเดือนนั้น)
```

---

## 4. Permission Matrix

| Action | USER | QMS | MR | IT |
|--------|------|-----|----|----|
| ดู KPI ตัวเอง | ✅ | ✅ | ✅ | ✅ |
| สร้าง KPI | ❌ | ✅ | ❌ | ✅ |
| กรอกผลรายเดือน | ✅ (แผนกตัวเอง) | ✅ | ✅ | ✅ |
| Review / Approve | ✅ (ถ้าได้รับมอบหมาย) | ✅ | ✅ | ✅ |
| จัดการ KpiDept | ❌ | ✅ | ❌ | ✅ |

---

## 5. Files ที่รับผิดชอบ

### Backend
- `services/kpiService.ts` — KPI Objectives Logic (31KB)
- `services/kpiMonthlyService.ts` — Monthly Report Logic (14KB)
- `services/kpiDeptService.ts` — Department management
- `services/kpiMonthlyReminderService.ts` — Reminders
- `repositories/kpiRepository.ts`
- `repositories/kpiObjectiveRepository.ts`
- `repositories/kpiMonthlyReportRepository.ts`
- `repositories/kpiMonthlyDetailRepository.ts`
- `repositories/kpiCorrectiveActionRepository.ts`

### API Routes
- `app/api/kpi/` — CRUD KPI
- `app/api/kpi/[id]/monthly/` — Monthly Reports
- `app/api/kpi/[id]/monthly/[reportId]/attachment/` — อัปโหลด Attachment

### Frontend Components
- `components/kpi/` — Components ทั้งหมด
- `app/(dashboard)/qms/kpi/` — Pages

---

## 6. Schema ที่เกี่ยวข้อง

```prisma
model KPI                  // KPI ประจำปี-แผนก
model KPIObjective         // เป้าหมายแต่ละข้อ
model KPIMonthlyReport     // รายงานรายเดือน (มี Attachment)
model KPIMonthlyDetail     // ผลของแต่ละ Objective ในเดือนนั้น
model KPICorrectiveAction  // แผนแก้ไขเมื่อ NOT_OK
model KpiDept              // แผนกของ KPI System

enum KpiObjectiveStatus { DRAFT PENDING_REVIEW PENDING_APPROVAL APPROVED REJECTED }
enum MonthlyStatus      { DRAFT PENDING_REVIEW PENDING_APPROVAL APPROVED REJECTED }
enum AchievedStatus     { PENDING OK NOT_OK }
```

---

## 7. กฎสำคัญของ Module นี้

1. KPI ต้อง unique ต่อ `(department, yearly)` — 1 แผนกมีได้ 1 KPI ต่อปี
2. Monthly Report ต้อง unique ต่อ `(kpiId, month, year)`
3. เมื่อ `AchievedStatus = NOT_OK` ต้องมี `KPICorrectiveAction` อย่างน้อย 1 รายการ
4. Attachment ของ Monthly Report ใช้ `attachmentSpItemId` สำหรับ Fresh URL
5. ดาวน์โหลด Attachment ต้องผ่าน `/api/sharepoint/get-file?itemId=attachmentSpItemId`
6. Frequency: MONTHLY, QUARTERLY, SEMI_ANNUALLY, ANNUALLY
