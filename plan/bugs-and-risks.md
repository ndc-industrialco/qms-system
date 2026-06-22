# Code Quality Report: Bugs, Errors, and Risks

## Summary

Analysis of the QMS system codebase revealed several critical issues across services, repositories, and API routes. Issues are categorized by severity and domain.

---

## Critical Bugs (High Priority)

### 1. KPI Master Review — Redundant Status Update
**File:** `services/kpiService.ts` (line 273)
**Severity:** Medium

The `reviewObjectives` method redundantly sets status to `PENDING_REVIEW` (same as current status). This is technically harmless but indicates incomplete logic - the monthly version properly computes `nextStatus` based on approver existence. Consider removing the redundant line.

```typescript
const updated = await db.$transaction(async (tx) => {
  const result = await this.kpiRepo.setStatus(id, 'PENDING_REVIEW', tx); // Redundant
```

### 2. KPI Monthly Review API — Incorrect Approver Token Targeting
**File:** `app/api/kpi/[id]/monthly/[reportId]/review/route.ts` (lines 27-75)
**Severity:** High

When `updated.status === 'PENDING_APPROVAL'`, the code resolves `approverAuthId` incorrectly:

```typescript
const approverAuthId = (() => {
  const sig = detail.approvalSignatures?.find((s: { step: string }) => s.step === 'APPROVER');
  return (sig as Record<string, unknown>)?.signerAuthUserId as string | null | undefined ?? approverId;
})();
```

If `signerAuthUserId` is null on the signature record, it falls back to `approverId` (a legacy local user ID) instead of `detail.kpi.approverAuthUserId`. This can cause tokens to be issued to the wrong user ID when Auth Center integration is active.

### 3. Duplicate/Broken Code Block in carService.ts
**File:** `services/carService.ts` (lines 546-562)
**Severity:** Medium

Large commented-out code block (lines 546-562) contains orphaned else statement that would cause syntax errors if uncommented. This indicates incomplete refactoring and should be removed.

### 4. Missing Status Validation in Car Review Response
**File:** `services/carService.ts` (lines 718-800)
**Severity:** Medium

The `reviewResponseByMR` and `reviewResponseByMRAuthenticated` methods do not validate that the reviewer is the originally assigned MR user. Any authenticated user can approve/reject via token, even if they weren't the intended recipient. The authenticated version should verify the MR role.

---

## Concurrency & Race Condition Risks

### 5. CAR Sequence Number — Unsafe Preview Method
**File:** `repositories/carSequenceRepository.ts` (line 25-32)
**Severity:** High (as noted in docs)

The `previewNext` method runs a SELECT outside any transaction, allowing race conditions:

```typescript
async previewNext(year: number): Promise<number> {
  const existing = await db.systemConfig.findUnique({...});
  return existing ? parseInt(existing.configValue, 10) + 1 : 1;
}
```

If called concurrently during testing, it could return stale sequence numbers.

### 6. Action Token Concurrent Use Detection
**File:** `repositories/carRepository.ts` (line 385-392, 565-572)
**Severity:** Medium

The `updateMany` query checks `count === 0` after `usedAt` set, but this check happens after the update. In a concurrent scenario, both requests could pass validation before either updates. The current approach detects but does not prevent concurrent use.

---

## Logic Flow Issues

### 7. KPI Monthly Submit — Uses Legacy User ID
**File:** `app/api/kpi/[id]/monthly/[reportId]/submit/route.ts` (line 30)
**Severity:** Medium

```typescript
const reviewerId = body.reviewerUserId || detail.kpi.reviewerUserId;
```
This falls back to `reviewerUserId` which may be a legacy local ID. Should fall back to `reviewerAuthUserId` for Auth Center compatibility.

### 8. Missing Audit Log Transaction
**File:** `services/documentControlService.ts` (lines 105-114, 330-338)
**Severity:** Medium

`createDocument` and `deleteDocument` methods call `AuditService.record` outside the main transaction. If the main operation succeeds but audit fails (network/DB error), audit trail is incomplete.

---

## Potential Runtime Errors

### 9. Null/Undefined Property Access
| File | Line | Issue |
|------|------|-------|
| `kpiService.ts` | 741 | `approverToken` may be undefined when no approver, but code proceeds to email |
| `kpiMonthlyService.ts` | 156-165 | `sigBody?.reviewerUserId` may be undefined, causing upsert with null signerUserId |
| `carService.ts` | 626 | `carAuthDeptId === responderAuthDepartmentId` - both may be undefined causing false negative |

### 10. Missing Env Var Validation in Email Functions
**File:** `services/carEmailService.ts`, `services/email.ts` (line 87, 13)
**Severity:** Low

Multiple functions call `getAppUrl()` which relies on `NEXTAUTH_URL` env var. If unset, returns malformed URLs like `undefined/car/...`.

---

## Security Concerns

### 11. Token Validation Lacks Actor Identity Check
**File:** `services/carService.ts` (lines 718-740, 983-1000)
**Severity:** Low

The `reviewResponseByMR` and `closeCar` methods only validate token existence and expiry, but don't verify that the requestor's `authUserId` matches `tokenData.issuedTo` before processing. The authenticated variants should add this check.

---

## Performance Concerns

### 12. CAR Reminder Service Uses KEYS *
**File:** `services/carReminderService.ts` (line 20)
**Severity:** Medium (as noted in docs)

```typescript
const keys = await redis.keys(`${PREFIX}*`);
```
This operation is O(N) and blocks Redis. Should use `SCAN` cursor for production scalability.

---

## Type Safety Issues

### 13. Extensive Use of Unsafe Type Casting
**File:** Multiple services (`kpiService.ts`, `kpiMonthlyService.ts`, `carService.ts`)
**Severity:** Low

Pattern `const reviewerAuthId = (kpi as Record<string, unknown>).reviewerAuthUserId as string | null | undefined` is used extensively. This indicates Prisma types aren't properly exposing `authUserId` fields, suggesting schema/type misalignment.

---

## Linting Issues (From npm run lint)

### Architecture Violations (10 errors)

| File | Issue | Rule |
|------|-------|------|
| `app/api/announcements/public/route.ts` | Direct `@/lib/db` import in route handler | `ndc/no-db-in-api` |
| `app/api/audit/attachments/upload/route.ts` | Direct `@/lib/db` import in route handler | `ndc/no-db-in-api` |
| `app/api/audit/plans/[id]/announce/route.ts` | Direct `@/lib/db` import in route handler | `ndc/no-db-in-api` |
| `app/api/audit/standards/[id]/route.ts` | Direct `@/lib/db` import in route handler | `ndc/no-db-in-api` |
| `app/api/audit/standards/route.ts` | Direct `@/lib/db` import in route handler | `ndc/no-db-in-api` |
| `services/audit/auditFindingService.ts` | Direct `@/lib/db` import in service | `ndc/no-db-in-api` |
| `services/audit/auditPlanService.ts` | Direct `@/lib/db` import in service | `ndc/no-db-in-api` |
| `services/audit/auditPlanWorkflowService.ts` | Direct `@/lib/db` import in service | `ndc/no-db-in-api` |
| `services/audit/auditSignReportService.ts` | Direct `@/lib/db` import + require() import | `ndc/no-db-in-api`, `@typescript-eslint/no-require-imports` |

### Unused Variables (11 warnings)

| File | Variable |
|------|----------|
| `app/(dashboard)/qms/sharepoint/page.tsx` | `Trash2` |
| `components/announcements/AnnouncementTableRow.tsx` | `CalendarDays` |
| `components/audit/AuditPlanListTable.tsx` | `AuditPlanFormModal`, `isPrivileged` |
| `components/common/ActionButtons.tsx` | `ActionSize` |
| `components/dar/DarTable.tsx` | `Button` |
| `components/document-control/DocumentControlListClient.tsx` | `Eye` |
| `components/kpi/KpiObjectiveTable.tsx` | `Button` |
| `components/layout/DashboardSidebar.tsx` | `Upload` |
| `services/kpiMonthlyService.ts` | `getUserSnapshot`, `NotificationService` |

---

## Recommendations

1. **Fix Bug #2** - The approver token targeting issue causes incorrect user ID attribution
2. **Remove dead code** - Clean up commented blocks in carService.ts (lines 546-562)
3. **Fix architecture violations** - Move direct DB queries from API route handlers to repositories
4. **Add token-to-actor verification** - Validate `actor.authUserId === tokenData.issuedTo` in authenticated endpoints
5. **Migrate to SCAN** - Replace `KEYS *` in carReminderService for Redis scalability
6. **Wrap audit logging in transactions** - Move audit calls inside `db.$transaction` blocks where possible
7. **Remove unused imports** - Clean up the 11 unused variable warnings
8. **Fix require() import** - Use ES module imports in auditSignReportService.ts

---

## Test Results

All 43 unit tests pass across 4 test files. Test coverage does not reflect the potential issues identified in this report, as these are integration/concurrency edge cases not covered by current unit tests.