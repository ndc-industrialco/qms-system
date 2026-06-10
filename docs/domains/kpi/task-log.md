# KPI Task Log

- [x] Initial setup
- [x] Implement Option B: DB Action Token for secure email approvals.
- [x] Fix KPI Email Idempotency bug (append token to idempotency key to allow emails on re-submit after recall).
- [x] Standardize KPI approval signatures using `ApprovalSignature` table (prepare -> reviewer -> approver).
- [x] Standardize KPI Monthly Report Approval workflow (Added Reviewer assign dialog, signatures, tokens, and fixed 409 state transition on REJECTED -> PENDING_REVIEW).
- [x] Fixed Email Action Token redirect routing for KPI Monthly `REVIEWER` role (`resolveActionUrl`).
- [x] KPI Monthly drawer: pass `userId` from page -> `KpiMonthlyClient` -> `KpiMonthlyDetailDrawer` to enable user-specific permission checks.
- [x] KPI Monthly drawer: close drawer automatically after submit-for-review succeeds (`handleAssignConfirm`).
- [x] KPI Monthly drawer: removed "mark reviewed" button; reviewer flow is email-only, and only the approve button remains for `PENDING_APPROVAL` when the assigned approver or privileged roles can act.
- [x] KPI Monthly drawer: `isEditable` now enforces preparer-only edit access; non-privileged users who are not the original preparer (`report.prepareBy`) cannot edit `DRAFT` or `REJECTED` reports.
- [x] Approve page (`/approve/[id]/reviewer?type=kpi-monthly` and `/approve/[id]/approver?type=kpi-monthly`): Developed full review/approve UI via `KpiApproveActionClient`; now shows approval signature timeline, corrective actions per `NOT_OK` detail, remark, and attachment link. `KpiMonthlyService.getReportById` updated to include `approvalSignatures` in response.
- [x] Fixed 409 on monthly review: `PENDING_REVIEW -> PENDING_APPROVAL` added to state machine; `ensureMonthlyStatusTransition` moved to after `nextStatus` is determined in `reviewReport`.
- [x] KPI Monthly approval timeline: reduced to 2 steps (`Preparer -> Reviewer` only, no approver). `KpiApprovalTimeline` now accepts `steps` prop; added `KPI_MONTHLY_STEPS` export. `KpiApproveActionClient` passes monthly steps for `type=kpi-monthly`.
- [x] Audited KPI module against the updated API and UI rules; identified KPI master workflow-state mismatch and KPI UI-rule gaps to address next.
