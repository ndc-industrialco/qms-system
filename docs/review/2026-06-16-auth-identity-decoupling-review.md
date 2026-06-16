# Auth Identity Decoupling Review Handoff

Date: 2026-06-16
Scope: DAR, CAR, Document Control, dashboard/document-control aggregate queries
Goal: move business models away from direct Prisma relations to local `User` / `Department`, and use `authUserId` / `authDepartmentId` plus snapshot fields instead

## What Was Changed

### 1. DAR models decoupled from local User/Department relations

Updated models:
- `DarMaster`
- `DarApproval`
- `ApprovalSignature`
- `QmsProcessing`

Key changes:
- removed direct Prisma relation dependency on local `User` / `Department`
- added snapshot fields such as:
  - requester name / email / employeeId / department name
  - assigned user name / employeeId / department name
  - signer name / email / department name
  - QMS processor name / employeeId
- service layer now writes snapshot data during submit / assign reviewer / approve / reject
- read model still returns UI-friendly shape

Primary files:
- `prisma/schema.prisma`
- `services/darService.ts`
- `repositories/darRepository.ts`
- `repositories/approvalSignatureRepository.ts`
- `repositories/qmsProcessingRepository.ts`
- `app/api/dar/[id]/approve/route.ts`
- `app/api/dar/[id]/assign-reviewer/route.ts`

### 2. CAR models decoupled from local User/Department relations

Updated models:
- `CarMaster`
- `CarResponse`
- `CarVerification`
- `CarMrSignature`
- `CarMrResponseReview`
- `CarAttachment`

Key changes:
- removed direct Prisma relation dependency on local `User` / `Department`
- added snapshot fields such as:
  - issuer name / employeeId
  - target department name
  - responder name / employeeId
  - verifier name / employeeId
  - MR signer / reviewer name / employeeId
  - attachment uploader name
- repository read path now selects scalar + snapshot fields instead of relation trees
- service layer reconstructs response shape expected by UI
- write path fills snapshots during create / respond / verify / MR review / MR close / re-CAR

Primary files:
- `prisma/schema.prisma`
- `repositories/carRepository.ts`
- `services/carService.ts`

### 3. Document Control models decoupled from local User/Department relations

Updated models:
- `DocumentControl`
- `DocumentControlRevision`

Key changes:
- removed direct Prisma relation dependency on local `User` / `Department`
- added snapshot fields:
  - `createdByName`
  - `updatedByName`
  - `departmentName`
  - revision `createdByName`
- repository read path now selects scalar + snapshot fields instead of `createdBy`, `updatedBy`, `department`
- service layer reconstructs `createdBy`, `updatedBy`, `department`, `revisions[].createdBy` objects for UI compatibility
- create / update / upload revision now persist snapshot values

Primary files:
- `prisma/schema.prisma`
- `repositories/documentControlRepository.ts`
- `services/documentControlService.ts`
- `app/api/document-controls/route.ts`
- `app/api/document-controls/[id]/route.ts`
- `app/api/document-controls/[id]/upload/route.ts`
- `types/documentControl.ts`

### 4. Dashboard queries fixed after Department back-relation removal

Updated pages:
- `app/(dashboard)/page.tsx`
- `app/(dashboard)/qms/document-controls/page.tsx`

Key changes:
- removed dependence on `Department.docControls`
- replaced with direct aggregation from `documentControl` and `documentCategory`

## What Was Verified

Commands run:

```powershell
npx prisma validate
npx prisma generate
npx prisma db push
npx tsc --noEmit
```

Status:
- all commands passed after the final changes

## Review Focus

Reviewer should check these areas carefully.

### A. Snapshot correctness

Verify that snapshot values are written at the correct business moment:
- DAR requester / reviewer / approver / QMS processor
- CAR issuer / responder / verifier / MR reviewer / MR signer
- Document creator / updater / revision uploader

Questions to check:
- if a user changes profile later, should old historical records stay with old snapshot values
- if a user has missing `name` or `employeeId`, does UI still render safely

### B. Permission behavior

Verify that auth checks still work correctly after relation removal:
- DAR owner / approver access
- CAR department access
- document edit / delete role checks

Important note:
- some flows still support local fallback using `departmentId` or local user id when auth key is not present
- this is intentional for transition compatibility

### C. Email / notification behavior

Verify that notifications still have enough data after relation removal:
- DAR approval emails
- CAR issue / respond / verify / re-CAR emails
- document audit trail and metadata display

### D. UI compatibility

Check pages/components that depend on reconstructed objects:
- DAR detail / review / timeline / print
- CAR detail / timeline / list / MR panels
- document detail / list / drawer / revision history

## Known Remaining Gaps

The system is not yet ready to delete `User` and `Department` tables completely.

Remaining blockers:

### 1. Announcement still depends on local User relation

Current:
- `Announcement.createdBy -> User`

Impact:
- cannot remove local `User` table yet

### 2. DocumentCategory still depends on local Department relation

Current:
- `DocumentCategory.departmentId -> Department`

Impact:
- cannot remove local `Department` table yet

### 3. Department membership / local mirror admin logic still exists

Current examples:
- `services/userService.ts`
- `app/api/it/users/[id]/role/route.ts`
- `repositories/userRepository.ts`

Impact:
- QMS still maintains local user/department mirror behavior

### 4. KPI and approval config still use local user resolution

Current examples:
- `services/kpiService.ts`
- `services/kpiMonthlyService.ts`
- `services/approvalConfigService.ts`

Impact:
- auth identity migration is not complete across all modules

### 5. DAR still has local department distribution relation

Current:
- `DarDistribution.departmentId -> Department`

Impact:
- `Department` table is still required for DAR distribution and several UI/report flows

## Recommended Next Phase

Recommended order:

1. Convert `Announcement` to creator snapshot
2. Convert `DocumentCategory` to `authDepartmentId + departmentName`
3. Convert KPI / ApprovalConfig to `authUserId-first`
4. Decide whether DAR distribution should remain as local business reference or move to auth department key
5. Only after that, assess whether local `User` / `Department` tables can be reduced further or removed

## Reviewer Outcome Template

Suggested reviewer output:

- `PASS`: implementation is structurally correct, only minor cleanup remains
- `PASS WITH FIXES`: logic direction is correct but there are specific runtime or data consistency issues
- `BLOCKED`: there is a correctness issue that prevents continuing with further identity-table removal

If reviewer finds issues, please classify by:
- schema mismatch
- snapshot write bug
- permission regression
- UI compatibility regression
- migration sequencing risk
