# Current State

_Last updated: 2026-06-19_

## Completed Features

- Authentication (MS Graph / Credentials) [COMPLETED]
- Department & User Management [PARTIAL]
- Document Action Request (DAR) submission and routing [PARTIAL]
- Repository workflow guidance modularized into `rules/` and `portable/rules/` [COMPLETED]
- KPI Domain [COMPLETED]:
  - KPI Master & Objective setting flows (Forms, Drawers, Tables)
  - KPI Monthly Reporting and Details flows (`ApprovalSignature` table)
  - KPI Approval & Signature timelines: Master (Preparer → Reviewer → Approver); Monthly (Preparer → Reviewer)
  - Action Tokens (DB Token) fully integrated for email approvals
  - Approve/Review action pages (`/approve/[id]/reviewer` and `/approve/[id]/approver`) for `type=kpi` and `type=kpi-monthly`
- Approval Action Tokens (DB Token for secure email links) [COMPLETED]
- External integrations (SharePoint, MS Graph, Email) [PARTIAL]
- CAR (Corrective Action Request) domain [COMPLETED — backend + frontend + Redis reminder]:
  - Schema: 6 models, 3 enums, `CAR` added to `ApprovalModule`
  - Backend: `carService.ts`, `carEmailService.ts`, `carRepository.ts`, `carSequenceRepository.ts`, `carNotificationService.ts`, `carReminderService.ts`
  - API routes: GET/POST `/api/car`, CRUD `/api/car/[id]`, issue/respond/verify/close/re-car/next-number, review-response
  - Cron endpoint: `GET /api/cron/car-reminder` (bearer-auth `CRON_SECRET`, calls `CarReminderService.processAllDue`)
  - Frontend: `CarFormModal`, `CarListTable`, `CarDetailClient`, `CarTimeline`, `CarRespondForm`, `CarVerifyForm`, `CarMrSignDialog`, `CarMrResponseReviewPanel`, `CarIssueDialog`, `CarAttachmentUpload`, `CarStatusBadge`, `CarRootCauseCheckbox`
  - Pages: QMS list/detail, User list/detail, MR sign-off page (`/approve/car/[id]/mr`), MR response review page (`/approve/car/[id]/mr-response`)
  - MS Graph integration: `GraphUserPicker` and `GraphGroupPicker` used in `CarFormModal`
  - Redis Reminder Job: `CarReminderService` schedules 3-day email reminders while status = ISSUED; fires via `/api/cron/car-reminder`
  - In-app notifications: `carNotificationService.ts` → `notifyCarUser()` writes `Notification` rows via `NotificationRepository`
  - Pending: E2E tests
- Announcements domain [COMPLETED]:
  - CRUD + Toggle Active/Inactive, Redis cache (TTL 60s)
  - Display types: LIST / SCROLLING (auto-expiry 7d) / BANNER
  - Email on Publish: `sendAnnouncementEmail()` via MS Graph delegated-auth, triggered with `GraphGroupPicker` selection on create
  - Public API: `GET /api/announcements/public` (company-center feed), `GET /api/announcements/ticker` (scrolling bar)
  - Dashboard feed (`DashboardAnnouncementsFeed`), Ticker bar (`AnnouncementTicker`)
- Audit Log UI [COMPLETED]:
  - Page: `/it/audit-logs` (IT role required)
  - Component: `AuditLogTable` — client-side table with filter/search
  - API: `GET /api/audit-logs`, `GET /api/audit-logs/export` (CSV)
- In-app Notification System [COMPLETED]:
  - `Notification` model in DB, `NotificationRepository`, `notificationService.ts`
  - APIs: `GET /api/notifications`, `PATCH /api/notifications/[id]/read`, `PATCH /api/notifications/read-all`
  - `NotificationBell` component in header (unread count badge + dropdown)
- Approvals pending summary: `GET /api/approvals/pending-summary` [COMPLETED]
- Auth Center integration (delegated bearer-token forwarding, session registry) [COMPLETED — Phase 3]
- Document Control domain [PARTIAL]:
  - Upload, Preview (SharePoint), Search, Download Log
  - Category CRUD, Department folder view, Upload Revision
  - Pending: Multi-level approval workflow, email notifications on status change

## Partially Completed Features

- Full Document Control Lifecycle (Approval workflow not yet implemented)
- QMS DAR Processing steps
- System Health and Audit Logs (backend done; UI done; CSV export done)

## Missing Features

- NOT IMPLEMENTED: Full E2E tests for all UI flows.
- NOT IMPLEMENTED: Advanced analytics dashboard.
- NOT IMPLEMENTED: Internal Audit Module (plan, findings, finding→CAR link, PDF export).
- NOT IMPLEMENTED: External Audit Module.
- NOT IMPLEMENTED: Document Control Multi-Level Approval Workflow.
- NOT IMPLEMENTED: AI RAG Module (pgvector, embedding pipeline, chat UI).

## Technical Debt

- Some API patterns might still need migration to standard `auditService`.
- CAR `AuditService` actions (ISSUE, RESPOND, VERIFY_1, VERIFY_2, CLOSE, RE_CAR) extended inline — review if audit log viewer filters on these.
- `carReminderService.processAllDue` scans all Redis keys with `KEYS *` — safe for current load but not for high-volume clusters; upgrade to `SCAN` cursor if key count grows large.
- `18 local users` with no `employeeId` remain unmatched from Auth Center backfill.

## Known Risks

- Neon Serverless connection limits or timeouts.
- SharePoint/MS Graph token expirations.
- Email delivery failures if idempotency isn't strictly enforced. *(Resolved for KPI and CAR email workflows.)*
- CAR sequence number generation uses `SystemConfig` upsert — safe under normal load but untested under high concurrency.
- `CRON_SECRET` env var must be set for CAR reminder cron to work.

## Recommended Next Tasks

- Implement Internal Audit Module (Sprint 4).
- Implement Document Control Multi-Level Approval Workflow.
- Add comprehensive Vitest coverage (priority: `carSequenceRepository` race condition, `carService.verifyCar` branching).
- Complete Auth Center Phase 4 dual-write (when M2M credentials available).
- Ensure all endpoints use standard audit logging.
