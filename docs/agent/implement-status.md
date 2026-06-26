# Implementation Status

_Last updated: 2026-06-22_

## Batch: Audit Schedule Team Members + Wizard Rework

### Status: COMPLETE

### Changes Made

#### Schema (`prisma/schema.prisma`)
- Added `AuditTeamRole` enum (LEAD_AUDITOR, AUDITOR, OBSERVER, AUDITEE) after `AuditScheduleConfirmStatus`
- Added `auditeeNotifyDept Boolean @default(true)` and `team AuditScheduleTeamMember[]` relation to `AuditSchedule`
- Added `appointmentId String? @map("appointment_id")` to `AuditPlan`
- Added `AuditScheduleTeamMember` model (`audit_schedule_team_members` table) with cascade delete
- Applied via `prisma db push` (DB was already in sync with new schema)
- `prisma generate` — complete

#### Types (`types/audit.ts`)
- Added `AuditTeamRole` union type
- Added `AuditScheduleTeamMemberRow` type
- Added `AUDIT_TEAM_ROLE_LABELS` constant (Thai labels)
- Added `auditeeNotifyDept: boolean` and `team: AuditScheduleTeamMemberRow[]` to `AuditScheduleRow`
- Added `appointmentId: string | null` to `AuditPlanDetail`

#### Validations (`lib/validations/audit.ts`)
- Added `appointmentId: z.string().optional()` to `auditPlanCreateSchema`
- Added `auditeeNotifyDept: z.boolean().default(true)` and `team: z.array(...)` to `auditScheduleCreateSchema`

#### Repository (`repositories/audit/auditPlanRepository.ts`)
- Updated `findDetailById` to include `{ team: { orderBy: { role: 'asc' } } }` in schedules include

#### Service (`services/audit/auditPlanService.ts`)
- `createPlan`: passes `appointmentId` to `tx.auditPlan.create`
- `createSchedule`: reads `team` from input, creates `AuditScheduleTeamMember` records in transaction, derives lead from LEAD_AUDITOR entry; passes `auditeeNotifyDept`
- `updateSchedule`: replaces team members in transaction (deleteMany + createMany), updates lead auditor snapshots from LEAD_AUDITOR entry; passes `auditeeNotifyDept`

#### Page (`app/(dashboard)/audit/plans/[id]/page.tsx`)
- Added `appointmentId: plan.appointmentId ?? null` to plan serialization
- Added `auditeeNotifyDept: s.auditeeNotifyDept` and `team: s.team?.map(...)` to schedule serialization

#### Component (`components/audit/AuditPlanFormModal.tsx`)
- Complete wizard rework: removed step 2 (global auditors), step flow is now 1 → "schedule" → "email" → "signature" → 3 (4 steps)
- Added `useAuditAppointments` hook usage; appointment picker in step 1
- Added `TeamMemberEntry` type; `DeptScheduleEntry` now includes `auditeeNotifyDept` and `team`
- `FormData` removes `auditors`, adds `appointmentId` and `appointmentMembers`
- Schedule step: per-department team assignment UI with Lead Auditor, Auditor, Observer, Auditee roles
- Auditee supports "notify whole dept" toggle vs individual selection
- `handleFinalSubmit`: passes `team`, `auditeeNotifyDept`, `appointmentId` to API; no longer calls assign-auditors

#### Component (`components/audit/AuditPlanDetailClient.tsx`)
- Added `AUDIT_TEAM_ROLE_LABELS` and `AuditTeamRole` imports from `@/types/audit`
- Schedule cards now show team grouped by role (LEAD_AUDITOR, AUDITOR, OBSERVER, AUDITEE) as pills
- Falls back to `leadAuditorNameSnapshot` display for schedules without team entries (backward compat)

### TypeScript Errors (all pre-existing, none introduced by this batch)
- `app/(dashboard)/audit/plans/[id]/page.tsx(83)` — `AuditAnnouncementRow.deliveryMode` missing in announcements map
- `components/audit/AuditPlanDetailClient.tsx(449, 542, 771, 1097)` — RHF/Zod resolver coerce.date typing

### Remaining Work / Notes
- The `AuditScheduleUpdateInput` type inferred from the partial schema now includes `team` and `auditeeNotifyDept` as optional fields; the service accesses them via type cast (`as { team?: ... }`) to avoid changing the inferred type contract — this is intentional and safe
- No migration file was created (DB was already in sync with new schema from worktree DB push); if a clean migration file is needed for production, run `prisma migrate dev --name add-schedule-team-members` after resetting migration history

---

## Batch: Audit Plan Review/Approve Wizard

### Status: COMPLETE

### Changes Made

#### Schema (`prisma/schema.prisma`)
- Added `PENDING_REVIEW` and `PENDING_APPROVAL` to `AuditPlanStatus` enum (between DRAFT and PLANNED)
- Added `AuditStandard` model (`audit_standards` table)
- Added fields to `AuditPlan`: `standards String[]`, `reviewerAuthUserId`, `reviewerEmail`, `reviewerNameSnapshot`, `approverAuthUserId`, `approverEmail`, `approverNameSnapshot`, `emailGroupMails String[]`
- Added fields to `AuditSignoff`: `signerNameSnapshot`, `signaturePath @db.Text`
- Migration: `20260619092252_audit_plan_review_approve_flow` — applied successfully
- `prisma generate` — complete

#### Validations (`lib/validations/audit.ts`)
- Added `standards: z.array(z.string()).default([])` to `auditPlanCreateSchema`
- Added `auditPlanSubmitSchema` and `AuditPlanSubmitInput` type

#### Service (`services/audit/auditPlanService.ts`)
- Added `PENDING_REVIEW` and `PENDING_APPROVAL` to `EDITABLE_STATUSES` and `MUTABLE_STATUSES`
- Added `standards: input.standards ?? []` to `tx.auditPlan.create` data

#### New Service (`services/audit/auditPlanWorkflowService.ts`)
- `submitPlan()`: DRAFT → PENDING_REVIEW, creates PREPARER signoff, issues token + notifies reviewer
- `reviewPlan()`: PENDING_REVIEW → PENDING_APPROVAL, creates REVIEWER signoff, notifies approver
- `approvePlan()`: PENDING_APPROVAL → PLANNED, creates APPROVER signoff, sends announcement email to emailGroupMails + auditors

#### Types (`types/audit.ts`)
- Added `PENDING_REVIEW` and `PENDING_APPROVAL` labels and colors

#### API Routes (new)
- `app/api/audit/standards/route.ts` — GET (list), POST (create, QMS/IT/MR only)
- `app/api/audit/standards/[id]/route.ts` — DELETE (QMS/IT/MR only)
- `app/api/audit/plans/[id]/submit/route.ts` — POST
- `app/api/audit/plans/[id]/review/route.ts` — POST
- `app/api/audit/plans/[id]/approve/route.ts` — POST

#### API Routes (bug fix)
- `app/api/audit/attachments/upload/route.ts` — fixed `auditorAssignments` → `auditors` (Prisma relation name mismatch)

#### Hook (`hooks/api/use-audit-standards.ts`)
- `useAuditStandards()`, `useCreateAuditStandard()`, `useDeleteAuditStandard()`

#### Components
- `components/audit/AuditPlanFormModal.tsx` — complete rewrite as 4-step wizard (creation only; edit mode removed per spec)
- `components/audit/AuditStandardsManager.tsx` — new: list/add/delete standards
- `components/audit/AuditPlanListTable.tsx` — removed edit button and editPlan state (edit mode removed)
- `components/audit/AuditPlanDetailClient.tsx` — removed `editPlan` prop from modal usage
- `components/audit/ExternalAuditIntakeForm.tsx` — added `Resolver` type cast to fix tsc error from `standards` default addition
- `components/layout/DashboardSidebar.tsx` — added "มาตรฐาน Audit" link under QMS section

#### Pages (new)
- `app/(dashboard)/qms/audit-standards/page.tsx` — server component, requires QMS/IT/MR role

### Pre-existing TypeScript Errors (NOT caused by this batch)
- `components/audit/AuditPlanDetailClient.tsx` — Resolver type mismatches on `zodResolver` usage (coerce.date returning unknown)
- `app/(dashboard)/audit/plans/[id]/page.tsx` — `AuditAnnouncementRow.deliveryMode` required but mapping doesn't include it

### Remaining Work
- Review/Approve UI: the `PENDING_REVIEW` and `PENDING_APPROVAL` tasks should appear in "My Tasks" page. Currently `getMyTasks` doesn't surface plans awaiting the current user's review/approval signature. This can be added to `auditPlanService.getMyTasks` in a follow-up.
- Signature pad in the wizard uses dataUrl (base64) — for large signatures this may be large. Consider limiting canvas size.
- `auditSignReportService.signInApp` still gates on `READY_TO_CLOSE` status — left unchanged per spec.
