# Current State

## Completed Features
- Authentication (MS Graph / Credentials) [PARTIAL / COMPLETED]
- Department & User Management [PARTIAL]
- Document Action Request (DAR) submission and routing [PARTIAL]
- Repository workflow guidance has been modularized into dedicated agent rule files under `rules/`. [COMPLETED]
- Portable cross-project agent templates and generic reusable rules now exist under `portable/` for reuse in new repositories. [COMPLETED]
- UI standards have been expanded into dedicated design-system rules under `rules/ui-*.md`. [COMPLETED]
- KPI Domain [PARTIAL]:
  - KPI Master & Objective setting flows are implemented (Forms, Drawers, Tables).
  - KPI Monthly Reporting and Details flows are implemented (including standard `ApprovalSignature` and Reviewer Assignment dialog).
  - KPI Approval & Signature timelines are present. Standardized via `ApprovalSignature` table. (Master: Preparer -> Reviewer -> Approver; Monthly: Preparer -> Reviewer only  no Approver step).
  - Action Tokens (DB Token) fully integrated for email approvals.
  - Approve/Review action pages (`/approve/[id]/reviewer` and `/approve/[id]/approver`) fully developed for both `type=kpi` and `type=kpi-monthly`  shows approval timeline, corrective actions, remark, and attachment.
  - Awaiting final E2E testing and potentially some standardizations around audit/action tokens.
- Approval Action Tokens (DB Token for secure email links) [COMPLETED]
- External integrations (SharePoint, MS Graph, Email) [PARTIAL]
- Background/Scripts (Check API Patterns) [PARTIAL]

## Partially Completed Features
- Full Document Control Lifecycle
- QMS Processing steps
- System Health and Audit Logs
- CAR (Corrective Action Request) domain:
  - Schema, all 6 models, enums  complete.
  - Backend: `carService.ts`, `carEmailService.ts`, `carRepository.ts`, `carSequenceRepository.ts`  complete.
  - API routes: GET/POST `/api/car`, CRUD `/api/car/[id]`, issue/respond/verify/close/re-car/next-number  complete.
  - Frontend: all components (`CarFormDrawer`, `CarListTable`, `CarDetailClient`, `CarTimeline`, `CarRespondForm`, `CarVerifyForm`, `CarMrSignDialog`, etc.)  complete.
  - Pages: QMS list/detail, User list/detail, MR sign-off page  complete.
  - MS Graph integration: `GraphUserPicker` and `GraphGroupPicker` components used in `CarFormDrawer` for issuer and email group selection  complete.
  - New API: `GET /api/ms-graph/groups/search` for group search  complete.
  - Pending: Redis reminder job runner (`carReminderService.ts`), E2E tests.

## Missing Features
- NOT IMPLEMENTED: Full E2E tests for all UI flows.
- NOT IMPLEMENTED: Advanced analytics dashboard.
- NOT IMPLEMENTED: CAR Redis reminder job runner (email reminder every 3 days while status = ISSUED).

## Technical Debt
- Some API patterns might need to be migrated to use standard `auditService`.
- Frontend code might still have some missing Radix UI implementations.
- CAR `AuditService` actions (ISSUE, RESPOND, VERIFY_1, VERIFY_2, CLOSE, RE_CAR) and resource type (CAR) extended inline  should be reviewed if audit log viewer filters on these.

## Known Risks
- Neon Serverless connection limits or timeouts.
- SharePoint/MS Graph token expirations.
- Email delivery failures if idempotency isn't strictly enforced. *(Note: Resolved for KPI token-based workflows by appending token slice to idempotency key).*
- CAR sequence number generation uses `SystemConfig` upsert  safe under normal load but untested under high concurrency.

## Recommended Next Tasks
- Implement `carReminderService.ts` (Redis scheduler, sends reminder every 3 days while CAR status = ISSUED).
- Complete full UI flows for Document Control.
- Rebaseline the delivery roadmap into Agile sprints aligned to actual repository status (CAR hardening, announcement email, document-control workflow, audit modules, AI RAG next month).
- Ensure all endpoints use standard audit logging.
- Add comprehensive Vitest coverage (priority: `carSequenceRepository` race condition, `carService.verifyCar` branching).

## Latest CAR Hardening
- `GET /api/car` now supports pagination, search, and status/source filters for both privileged and department-scoped views.
- `CarService` no longer performs direct CAR Prisma writes; write paths now go through `carRepository.ts`.
- `CarListTable` now follows shared enterprise table rules with URL-bound filters, pagination, and mobile card rendering.
