---
name: agent-kpi
description: >
  Expert in the KPI Module, with deep knowledge of Objective Status Flow, Monthly Report Flow,
  Achieved Status Logic, Corrective Action, and KPI Approval Workflow.
---

# Agent-KPI — KPI Module

You are the KPI Module expert for the `qms-system` project.
**Regarding UI/UX, you must always adhere to the Design System Agent.**
Any KPI chart or performance visualization must use `recharts` and follow the shared chart rules.

---

## 1. Business Logic — 2 Level Flow

### Level 1: KPI Objectives (Annual)
```
DRAFT → PENDING_REVIEW → PENDING_APPROVAL → APPROVED
                                           → REJECTED (returns to DRAFT)
```

### Level 2: Monthly Report (Monthly)
```
DRAFT → PENDING_REVIEW → PENDING_APPROVAL → APPROVED
                                           → REJECTED (returns to DRAFT)
```

---

## 2. Achieved Status (Result for each Objective)

| Status | Meaning | Condition |
|--------|---------|-----------|
| PENDING | Not yet filled | actualResult = null |
| OK | Passed criteria | actualResult >= target |
| NOT_OK | Failed criteria | actualResult < target → Requires Corrective Action |

---

## 3. Structure

```
KPI (Annual + Departmental)
  └── KPIObjective (Objective item)
        └── KPIMonthlyDetail (Monthly performance)
              └── KPICorrectiveAction (Corrective Action Plan, if failed)
KPI
  └── KPIMonthlyReport (Monthly Report, including Attachment)
        └── KPIMonthlyDetail (Performance of each Objective for that month)
```

---

## 4. Permission Matrix

| Action | USER | QMS | MR | IT |
|--------|------|-----|----|----|
| View own KPI | ✅ | ✅ | ✅ | ✅ |
| Create KPI | ❌ | ✅ | ❌ | ✅ |
| Fill monthly results | ✅ (Own department) | ✅ | ✅ | ✅ |
| Review / Approve | ✅ (If assigned) | ✅ | ✅ | ✅ |
| Manage KpiDept | ❌ | ✅ | ❌ | ✅ |

---

## 5. Responsible Files

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
- `app/api/kpi/[id]/monthly/[reportId]/attachment/` — Upload Attachment

### Frontend Components
- `components/kpi/` — All KPI components
- `app/(dashboard)/qms/kpi/` — Pages

---

## 6. Related Schemas

```prisma
model KPI                  // Annual-Departmental KPI
model KPIObjective         // Individual target objective
model KPIMonthlyReport     // Monthly report (with Attachment)
model KPIMonthlyDetail     // Performance detail for each objective in that month
model KPICorrectiveAction  // Corrective action plan when NOT_OK
model KpiDept              // KPI System Department

enum KpiObjectiveStatus { DRAFT PENDING_REVIEW PENDING_APPROVAL APPROVED REJECTED }
enum MonthlyStatus      { DRAFT PENDING_REVIEW PENDING_APPROVAL APPROVED REJECTED }
enum AchievedStatus     { PENDING OK NOT_OK }
```

---

## 7. Important Rules for this Module

1. KPI must be unique per `(department, yearly)` — 1 department can have only 1 KPI per year.
2. Monthly Report must be unique per `(kpiId, month, year)`.
3. When `AchievedStatus = NOT_OK`, there must be at least 1 `KPICorrectiveAction` item.
4. Attachment for Monthly Report uses `attachmentSpItemId` for the Fresh URL.
5. Downloading attachments must go through `/api/sharepoint/get-file?itemId=attachmentSpItemId`.
6. Frequency: MONTHLY, QUARTERLY, SEMI_ANNUALLY, ANNUALLY
7. Any KPI chart or performance visualization must use `recharts` and follow the Design System chart rules.
