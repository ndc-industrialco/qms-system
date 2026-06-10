# KPI Frontend

## Pages

| Route | Component | Description |
|---|---|---|
| `/qms/kpi` | `KpiObjectivesClient` | KPI master list with objectives |
| `/qms/kpi/[departmentId]` | `KpiDepartmentDetailClient` | Department KPI detail view |
| `/qms/kpi/monthly` | `KpiMonthlyClient` | Monthly report list/management |
| `/approve/[id]/reviewer?type=kpi` | `KpiApproveActionClient` (mode=reviewer, type=kpi) | Reviewer action page for KPI master |
| `/approve/[id]/approver?type=kpi` | `KpiApproveActionClient` (mode=approver, type=kpi) | Approver action page for KPI master |
| `/approve/[id]/reviewer?type=kpi-monthly&kpiId=` | `KpiApproveActionClient` (mode=reviewer, type=kpi-monthly) | Reviewer action page for monthly report |
| `/approve/[id]/approver?type=kpi-monthly&kpiId=` | `KpiApproveActionClient` (mode=approver, type=kpi-monthly) | Approver action page for monthly report |

## Key Components

### `KpiApproveActionClient`
Shared approve/review action page for both KPI master and monthly reports.

**Props:** `id` (documentId), `mode` ("reviewer" \| "approver"), `type` ("kpi" \| "kpi-monthly"), `kpiId?` (required for kpi-monthly)

**Data source:**
- `type=kpi` → `GET /api/kpi/:id` — returns KPI master with objectives and approvalSignatures
- `type=kpi-monthly` → `GET /api/kpi/:kpiId/monthly/:id` — returns monthly report with details, correctiveActions, approvalSignatures, remark, and attachment fields

**Features:**
- Approval signature timeline (`KpiApprovalTimeline`) for both kpi and kpi-monthly
- Objectives list (kpi only) with expandable detail rows
- Monthly details (kpi-monthly only) with corrective actions per NOT_OK detail
- Remark and attachment display (kpi-monthly only)
- Signature dialog (`KpiSignatureDialog`) for review/approve/reject actions
- Mobile bottom sheet with floating action bar

### `KpiApprovalTimeline`
Horizontal or vertical timeline showing approval steps with signatures, dates, and comments.

**Props:** `steps` (optional) — defaults to `KPI_STEPS` (3-step: PREPARER → REVIEWER → APPROVER). Pass `KPI_MONTHLY_STEPS` for monthly reports (2-step: PREPARER → REVIEWER only).

**Exports:** `KPI_MONTHLY_STEPS` — use when rendering a monthly report timeline.

### `KpiSignatureDialog`
Signature capture dialog (draw or upload) used before submitting review/approve/reject actions.

### `KpiMonthlyDetailDrawer`
Drawer for editing monthly report details, entering actual results, managing corrective actions, and submitting for review.
