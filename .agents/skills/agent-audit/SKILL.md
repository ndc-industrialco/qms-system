---
name: agent-audit
description: >
  Expert in the Audit Module, with deep knowledge of Audit Plan Flow, Schedule, Checklist, Finding,
  Corrective Action, Signoff, Appointment, and Session Plan.
---

# Agent-Audit — Audit Module

You are the Audit Module expert for the `qms-system` project.
**Regarding UI/UX, you must always adhere to the Design System Agent.**
Any audit chart, timeline visualization, or dashboard graphic must use `recharts` and follow the shared chart rules.

---

## 1. Business Logic — Audit Plan Status Flow

```
DRAFT → PENDING_REVIEW → PENDING_APPROVAL → PLANNED → ANNOUNCED
  → IN_PROGRESS → WAITING_CORRECTIVE → READY_TO_CLOSE → CLOSED
                                                       ↓ (if revisions required)
                                                    CANCELLED
```

---

## 2. Audit Appointment Status Flow (Auditor Announcement)

```
DRAFT → PENDING_REVIEW → PENDING_APPROVAL → PUBLISHED
```

---

## 3. Finding Flow

```
OPEN → RESPONDED → VERIFIED → CLOSED
     → REJECTED (returns to OPEN)
     → REOPENED (from CLOSED)
```

| Category | Meaning |
|----------|---------|
| NC | Non-Conformance |
| OBSERVATION | Observation |
| OFI | Opportunity for Improvement |

| Severity | Meaning |
|----------|---------|
| MINOR | Minor |
| MAJOR | Major |
| CRITICAL | Critical |

---

## 4. Roles

| Role | Responsibility |
|------|----------------|
| LEAD_AUDITOR | Lead Auditor — Can submit Checklist |
| AUDITOR | Auditor |
| OBSERVER | Observer |
| AUDITEE | Auditee — Can respond to Finding |

---

## 5. Audit Types & Modes

```typescript
enum AuditType { INTERNAL, EXTERNAL }
enum AuditMode { SYSTEM, FILE_UPLOAD }  // SYSTEM = done in app, FILE_UPLOAD = file attachment
```

---

## 6. Responsible Files

### Backend
- `services/audit/` — All Audit services
- `repositories/audit/` — All Audit repositories

### API Routes
- `app/api/audit/plans/` — CRUD Audit Plan
- `app/api/audit/schedules/` — Schedule management
- `app/api/audit/schedules/[id]/submit-checklist/` — Submit Checklist
- `app/api/audit/findings/` — Findings
- `app/api/audit/attachments/upload/` — Upload file

### Frontend Components
- `components/audit/` — All Audit components
- `app/(dashboard)/audit/` — Pages

---

## 7. Related Schemas

```prisma
model AuditPlan              // Audit plan
model AuditSchedule          // Individual audit schedule
model AuditScheduleTeamMember // Audit team member
model AuditAuditorAssignment  // Auditor assignment
model AuditFinding           // Finding
model AuditCorrectiveAction  // Finding corrective action plan
model AuditVerification      // Finding verification result
model AuditSignoff           // Signature to close plan
model AuditAttachment        // Attachment (resourceType: PLAN|FINDING|REPORT)
model AuditAnnouncement      // Announcement
model AuditReport            // Summary report
model AuditAppointment       // Auditor appointment announcement
model AuditSessionPlan       // Audit session plan (Gantt)

enum AuditPlanStatus    { DRAFT PENDING_REVIEW PENDING_APPROVAL PLANNED ANNOUNCED IN_PROGRESS WAITING_CORRECTIVE READY_TO_CLOSE CLOSED CANCELLED }
enum AuditAppointmentStatus { DRAFT PENDING_REVIEW PENDING_APPROVAL PUBLISHED }
enum FindingStatus      { OPEN RESPONDED VERIFIED CLOSED REOPENED REJECTED }
enum FindingCategory    { NC OBSERVATION OFI }
enum FindingSeverity    { MINOR MAJOR CRITICAL }
```

---

## 8. Important Rules for this Module

1. Checklist can only be submitted by Lead Auditor or QMS/IT/MR.
2. `AuditAttachment` uses `(resourceType, resourceId)` instead of FK — not relationId directly.
3. `sharePointItemId` in `AuditAttachment` is used for requesting a Fresh Download URL.
4. Downloading attachments must always go through `/api/sharepoint/get-file?itemId=sharePointItemId`.
5. Token-based approval: Use `ActionToken` for email-based approvals.
6. AuditNo format: `IA-{YYYY}-{SEQ:03d}` (Internal) or `EA-{YYYY}-{SEQ:03d}` (External).
7. Any audit chart, timeline visualization, or dashboard graphic must use `recharts` and follow the Design System chart rules.
