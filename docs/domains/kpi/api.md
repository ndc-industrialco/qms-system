# KPI API

All endpoints under `/api/kpi`.

## KPI Master

| Method | Path | Description |
|---|---|---|
| GET | `/api/kpi` | List/paginate KPI masters |
| POST | `/api/kpi` | Create KPI master |
| GET | `/api/kpi/:id` | Get KPI with objectives and approvalSignatures |
| POST | `/api/kpi/:id/submit` | Submit for review (DRAFT → PENDING_REVIEW) |
| POST | `/api/kpi/:id/review` | Review (PENDING_REVIEW → PENDING_APPROVAL) |
| POST | `/api/kpi/:id/approve` | Approve (PENDING_APPROVAL → APPROVED) |
| POST | `/api/kpi/:id/reject` | Reject |
| POST | `/api/kpi/:id/recall` | Recall to DRAFT |
| GET/POST | `/api/kpi/:id/objectives` | List / create objectives |
| PATCH/DELETE | `/api/kpi/:id/objectives/:objectiveId` | Update / delete objective |

## Monthly Reports

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/kpi/:id/monthly` | List / create monthly reports for a KPI |
| GET/PATCH | `/api/kpi/:id/monthly/:reportId` | Get (with approvalSignatures) / update report metadata |
| POST | `/api/kpi/:id/monthly/:reportId/submit` | Submit for review |
| POST | `/api/kpi/:id/monthly/:reportId/review` | Review; sends approver email token if approver assigned |
| POST | `/api/kpi/:id/monthly/:reportId/approve` | Approve |
| POST | `/api/kpi/:id/monthly/:reportId/reject` | Reject |
| POST | `/api/kpi/:id/monthly/:reportId/attachment` | Upload attachment to SharePoint |
| PATCH/DELETE | `/api/kpi/:id/monthly/:reportId/details/:detailId` | Update / manage detail result |
| GET/POST | `/api/kpi/:id/monthly/:reportId/details/:detailId/corrective-actions` | List / create corrective actions |
| DELETE | `/api/kpi/:id/monthly/:reportId/details/:detailId/corrective-actions/:actionId` | Delete corrective action |
