# KPI Backend

## Services

### `KpiMonthlyService` (`services/kpiMonthlyService.ts`)
Handles monthly report lifecycle.

| Method | Description |
|---|---|
| `getReportById(id)` | Fetches monthly report with details, correctiveActions, and `approvalSignatures` (via `ApprovalSignatureRepository.findByDocument`) |
| `submitReport(reportId, actor, sigBody?)` | DRAFT → PENDING_REVIEW; creates PREPARER + REVIEWER signature steps; sends reviewer email token |
| `reviewReport(reportId, actor, sigBody?)` | PENDING_REVIEW → PENDING_APPROVAL (if approver exists) or APPROVED; updates REVIEWER step |
| `approveReport(reportId, actor, sigBody?)` | PENDING_APPROVAL → APPROVED; updates APPROVER step |
| `rejectReport(reportId, reason, actor)` | Any in-review status → REJECTED; QMS/MR/IT only |

### `KpiService` (`services/kpiService.ts`)
Handles KPI master and objectives lifecycle (submit → review → approve/reject flow).

## Repositories

### `KpiMonthlyReportRepository`
- `findByIdWithDetails(id)` — includes `kpi` (with objectives), `details` (with kpiObjective, correctiveActions)
- `findPendingReviewByUser(userId)` / `findPendingApproveByUser(userId)` — used for approve queue counts

### `ApprovalSignatureRepository`
- `findByDocument(module, documentId)` — returns all steps with `signerUser` relation (used to populate approval timelines)
- `upsertStep(...)` — idempotent step write within a transaction

## State Machines

### Monthly Status (`lib/kpi-state-machine.ts`)
```
DRAFT → PENDING_REVIEW → APPROVED          (no approver assigned)
DRAFT → PENDING_REVIEW → PENDING_APPROVAL → APPROVED   (approver assigned)
PENDING_REVIEW | PENDING_APPROVAL → REJECTED → PENDING_REVIEW  (re-submit allowed)
```

**UI workflow (monthly):** Preparer → Reviewer only (2-step). The APPROVER step is not shown in the approval timeline for monthly reports.
