# Auth Identity Decoupling Review — Result

Date: 2026-06-16
Reviewer: Claude Sonnet 4.6
Scope: DAR, CAR, Document Control (services, repositories, API routes, dashboard)

---

## Verdict: PASS WITH FIXES

Implementation direction is correct. Snapshot data is written at the right business moments.
Permission checks are structurally sound. Two issues must be fixed before proceeding to the
next phase.

---

## A. Snapshot Correctness

### DAR

| Moment | Written | Correct |
|---|---|---|
| Submit | requester name / email / employeeId / dept | ✅ |
| Submit (PREPARER step) | signerUserId / authUserId / name / email / dept | ✅ |
| Assign reviewer | reviewer name / employeeId / dept | ✅ |
| Approve (each step) | actor name / email / dept | ✅ |
| Create MR step | mrUser name / employeeId / dept from identity snapshot | ✅ |
| Create QMS step | qmsUser name / employeeId / dept from identity snapshot | ✅ |
| QMS processing checklist | qmsUserName / employeeId / processDate | ✅ |
| Reject | actor snapshot captured | ✅ |

DAR attachments are **not yet decoupled** (`include: { uploadedBy: true }` relation still used in
`darRepository.findDetailById`). This was not in the declared scope so it is informational only.
It does mean `DarAttachment.uploadedBy` is still a live join and would break if the local `User`
table is removed.

Note: `uploadAttachment` immediate return (darService.ts:988) has `name: null` hardcoded —
this only affects the JSON response from the upload API; the subsequent full DAR re-fetch
returns the correct name via relation. Low impact.

### CAR

| Moment | Written | Correct |
|---|---|---|
| createCar | issuerName / employeeId from snapshot | ✅ |
| respondToCar | responderName / employeeId / authUserId with fallback | ✅ |
| verifyCar | verifierName / employeeId / authUserId with fallback | ✅ |
| reviewResponseByMR | mrUserName / employeeId / authUserId via token lookup | ✅ |
| closeCar | mrUserName / employeeId / authUserId via token lookup | ✅ |
| createReCar | copies issuer snapshot from original, wraps actor snapshot | ✅ |

#### BUG — `CarSummary.targetAuthDepartmentId` always null

**File**: `repositories/carRepository.ts:133-148` (`findManySummary`) and `:195-210` (`paginateSummaries`)

Neither select block includes `targetAuthDepartmentId`. The service mapper at
`carService.ts:335` reads it via `(r as Record<string, unknown>).targetAuthDepartmentId ?? null`
which always resolves to `null` because the field is not present on the returned row.

Effect:
- `getCarsByDepartment` and `getAllCars` → all `CarSummary.targetAuthDepartmentId` are null
- `listCars` summary rows → same
- Server-side WHERE filter in `paginateSummaries` works correctly (uses the field in WHERE)
- But the returned payload always carries `null`, so any client-side auth check on this field
  is silently broken

**Fix required**: add `targetAuthDepartmentId: true` to both select blocks.

### Document Control

| Moment | Written | Correct |
|---|---|---|
| createDocument | createdByName from snapshot | ✅ |
| updateDocument | updatedByName from snapshot | ✅ |
| addRevision | revision createdByName from snapshot | ✅ |
| updateDocument (dept change) | authDepartmentId dual-write | ✅ |

`_formatDocDetail` reconstructs `createdBy`, `updatedBy`, `department`, `revisions[].createdBy`
objects correctly for UI compatibility. The department `id` field prefers `authDepartmentId`
over local `departmentId` — acceptable for transition.

---

## B. Permission Behavior

### DAR owner / approver access

`getDarById` (darService.ts:269-274) checks `detail.requester.id === requesterId` and
`a.assignedUser.id === requesterId`. Both sides use local user ID. Correct for current state.

`submitDar` and `deleteDar` prefer `authUserId` comparison when both sides are populated,
with local ID fallback. Correct dual-check pattern.

`approveDar` (line 567-573): prefers `assignedAuthUserId === actor.authUserId` when both are
populated; falls back to local ID. Correct.

`findPendingApproval` in repository: tries `assignedAuthUserId` first, falls back to
`assignedUserId`. Correct.

### CAR department access

`respondToCar` (carService.ts:499-504):

```ts
const carAuthDeptId = (car as Record<string, unknown>).targetAuthDepartmentId as string | null | undefined;
const inTargetDept = (responderAuthDepartmentId && carAuthDeptId)
  ? carAuthDeptId === responderAuthDepartmentId
  : responderDepartmentId === car.targetDepartmentId;
```

`findForRespond` does select `targetAuthDepartmentId: true` (carRepository.ts:244), so the cast
is unnecessary but runtime behavior is correct. The `as Record<string, unknown>` pattern suggests
the TypeScript inferred type was not updated when the field was added to the select — type-safety
issue, not a runtime bug.

Same pattern appears in `createReCar` line 818 reading `targetAuthDepartmentId` from
`findDetailById` result. Field is in the select (carRepository.ts:38), cast is superfluous.

These casts should be removed but do not affect behavior.

### Document edit / delete role checks

Role checks for document control operations happen at the API route layer (not shown in scope)
and were not regressed by this change since no permission logic was moved.

---

## C. Email / Notification Behavior

### DAR email inconsistency — MR and QMS lookup

**File**: `app/api/dar/[id]/approve/route.ts:77-83` and `:118-122`

The approve route fetches the MR user via `CURRENT_MR_USER_ID` (local config key) only:

```ts
const mrConfigValue = await configRepo.findValueByKey("CURRENT_MR_USER_ID");
if (mrConfigValue) {
  const mrUser = await userRepo.findById(mrConfigValue);
```

The service layer (`darService.resolveDesignatedUser`) prefers `CURRENT_MR_AUTH_USER_ID`
first, then falls back to `CURRENT_MR_USER_ID`. The route does not mirror this preference.

**Scenario that fails**: if only `CURRENT_MR_AUTH_USER_ID` is configured (local key blank),
the approval action succeeds (service layer resolves MR correctly), the MR approval step is
created, but the email notification to MR is **not sent** because the route can't find the
user from the local key.

**Fix required**: update the route email lookup to match the service-layer resolution order
(try `CURRENT_MR_AUTH_USER_ID` → `userRepo.findByAuthUserId` → fallback to `CURRENT_MR_USER_ID`).
Same fix applies to QMS lookup at line 118-122.

### CAR emails

All CAR email calls use `targetEmailGroup` from the appropriately-scoped `findFor*` queries.
MR email uses config key lookup via `resolveMrUser()` which is consistent (auth key preferred).
No issues found.

---

## D. UI Compatibility

### DarApprovalRow — `assignedUser.department.id` is empty string

`darService.ts:136-138`:

```ts
department: a.assignedDepartmentName
  ? { id: "", name: a.assignedDepartmentName }
  : null,
```

The `department.id` field is `""`. If any UI component uses `department.id` as a React key,
route segment, or filter value, it will behave unexpectedly (all approvers' departments share
the same key). The `id` field should be either `a.assignedAuthDepartmentId` (if stored) or
explicitly documented as non-navigable.

This is not a regression from the decoupling (there was no `id` before) but should be noted
for UI components that display approval history.

### DAR detail / CAR detail / Document list

Reconstructed objects (`requester`, `issuer`, `responder`, `verifier`, `mrUser`, `createdBy`,
`updatedBy`, `department`) all follow the same shape expected by the existing UI types.
No UI shape regressions found.

---

## Issues Summary

| # | Severity | Location | Issue |
|---|---|---|---|
| 1 | **Must fix** | `carRepository.ts:133-148, 195-210` | `targetAuthDepartmentId` missing from summary select — always null in response |
| 2 | **Must fix** | `dar/[id]/approve/route.ts:77-83, 118-122` | MR/QMS email lookup uses local config key only, misses auth-stable key |
| 3 | Info | `darRepository.findDetailById:52-55` | DAR attachment `uploadedBy` still uses Prisma relation — blocks full User table removal |
| 4 | Minor | `darService.ts:136-138` | `DarApprovalRow.assignedUser.department.id` is `""` |
| 5 | Cleanup | `carService.ts:500, 818` | Unnecessary `as Record<string, unknown>` casts — fields are in inferred type |

---

## Recommended Next Steps

1. Fix issue #1: add `targetAuthDepartmentId: true` to `findManySummary` and `paginateSummaries`
   select blocks
2. Fix issue #2: update approve route email lookup to use `CURRENT_MR_AUTH_USER_ID` → `CURRENT_MR_USER_ID`
   fallback (same as service layer)
3. Log issue #3 as a blocker for full User table removal (alongside existing blockers in handoff doc)
4. Address issue #4 in a UI-side pass (store `assignedAuthDepartmentId` or accept limitation)
5. Clean up issue #5 (remove casts) as part of any type-maintenance pass

After fixes #1 and #2, the implementation is production-safe for the current transition state.
The system is not yet ready to remove local User/Department tables (confirmed by issue #3 and
the existing blockers listed in the handoff).
