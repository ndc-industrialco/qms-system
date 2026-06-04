# Approval Signature Hub - Development Plan

## Goal
Implement a centralized approval-signature model that supports DAR, KPI, and KPI Monthly with signer user id and signature path, while keeping current features compatible.

## Scope
- New model: `ApprovalSignature`
- New enum: `ApprovalModule`
- Expanded enum: `ApprovalStep` (supports MR/DCC/QMS and generic approver roles)
- Service integration for DAR/KPI/KPI Monthly flow
- Data migration with backfill

## Canonical Flow Mapping

### DAR (3 Signers)
1. Requester -> `module=DAR`, `step=PREPARER`
2. Requester Manager (Reviewer) -> `module=DAR`, `step=REVIEWER`
3. MR -> `module=DAR`, `step=APPROVER_MR`

Stored values per step:
- `signerUserId`
- `signaturePath`
- `action` (`PENDING` | `APPROVED` | `REJECTED`)
- `actionDate`
- `comment`

### KPI Master (3 Signers)
1. Preparer -> `module=KPI`, `step=PREPARER`
2. Reviewer -> `module=KPI`, `step=REVIEWER`
3. Approver -> `module=KPI`, `step=APPROVER`

### KPI Monthly (2 Signers target)
1. Preparer -> `module=KPI_MONTHLY`, `step=PREPARER`
2. Approver -> `module=KPI_MONTHLY`, `step=APPROVER`

Note: legacy monthly review endpoint exists; signature logging is still supported for compatibility.

## Implementation Phases

### Phase 1 - Schema Foundation
- Update `prisma/schema.prisma`
- Add `ApprovalSignature` model and relations to `User`
- Add `ApprovalModule` enum
- Extend `ApprovalStep` enum

Deliverable:
- Prisma schema compiles and supports a unified approval table.

### Phase 2 - Migration + Backfill
- Create migration: `20260530114000_add_approval_signature_hub`
- Create new table + indexes + FK
- Backfill from:
  - `DarApproval` -> `ApprovalSignature`
  - `kpis` reviewer/approver -> `ApprovalSignature`
  - `kpi_monthly_reports` prepare/approve (UUID-like IDs only) -> `ApprovalSignature`

Important limitation:
- KPI preparer user id is not in old schema, so historical preparer rows cannot be fully reconstructed from DB alone.

### Phase 3 - Repository Layer
- Add `repositories/approvalSignatureRepository.ts`
- Standard methods:
  - `upsertStep(...)`
  - `updateAction(...)`
  - `deleteByDocument(...)`

### Phase 4 - DAR Integration
- `services/darService.ts`
  - submit: reset/create pending preparer signature row
  - assign reviewer: upsert pending reviewer row
  - approve: upsert approved step with signature path
  - create MR step: upsert pending MR row
  - reject: upsert rejected row
  - delete DAR: cleanup signature rows

### Phase 5 - KPI Integration
- `services/kpiService.ts`
  - submit: write PREPARER/REVIEWER/APPROVER steps to `ApprovalSignature`
  - review: mark reviewer step approved
  - approve: mark approver step approved
  - reject: mark actor step rejected

### Phase 6 - KPI Monthly Integration
- `services/kpiMonthlyService.ts`
  - submit: write preparer approved + approver pending
  - review (legacy): mark reviewer approved
  - approve: mark approver approved
  - reject: mark approver rejected with reason in comment

### Phase 7 - Stabilization
- Run `prisma generate`
- Run lint/build checks
- Validate key endpoints by role and status transitions

## Operational Notes for New Devs
- Keep route handlers thin (`app/api/...`) and push logic into services/repositories.
- Continue writing legacy columns during transition (`DarApproval`, KPI status fields) until UI fully migrates.
- For any new module needing signatures, only add a new `ApprovalModule` enum value and wire service calls.

## Suggested Next Refactor (Post-Infra)
1. Add `preparerUserId` to `kpis` for complete KPI master signer identity.
2. Add signature payload for KPI reviewer/approver APIs (currently no signature input body).
3. Build a shared `ApprovalFlowService` to reduce duplicated step logic across modules.
4. Move pending-approval widgets to query `ApprovalSignature` instead of mixed legacy sources.
