# Auth Identity Migration — Phase 2 Plan

Date: 2026-06-16

## Background

DAR, CAR, and Document Control models have been decoupled from direct local User/Department Prisma relations. Snapshot fields are in place for all actor identities. authUserId / authDepartmentId dual-write is active. Two bugs were resolved in the previous session.

This document covers the remaining blockers before local User and Department tables can be reduced or removed.

---

## Phase 1 — Announcement Creator Snapshot

**Goal:** Remove the `createdBy -> User` Prisma relation from the Announcement model and replace it with an auth-stable creator snapshot.

**Scope:**
- `prisma/schema.prisma` — Announcement model
- `generated/prisma/models/Announcement.ts`
- Any service or API route that creates or reads Announcements

**Key Changes:**
- Drop the `createdBy` relation field and the `createdById` FK on Announcement
- Add `creatorAuthUserId String` and `creatorName String` snapshot fields
- On create, write both snapshot fields from the auth session instead of linking to a local User row
- Update any read queries that join or select through `createdBy` to use the new snapshot fields

**Schema Changes:**
- Remove: `createdById Int?` and `createdBy User? @relation(...)` from Announcement
- Add: `creatorAuthUserId String` and `creatorName String`

**Risk Notes:**
- Low risk. Announcement creation is a single write path. No approval workflow depends on this relation.
- Verify no existing UI renders `announcement.createdBy.name` before deploying; update to `announcement.creatorName`.
- Data migration needed for any existing rows: backfill `creatorAuthUserId` and `creatorName` from joined User data before dropping the FK.

---

## Phase 2 — DocumentCategory Auth Department Reference

**Goal:** Remove the `departmentId -> Department` FK from DocumentCategory and replace it with an auth-stable department identifier.

**Scope:**
- `prisma/schema.prisma` — DocumentCategory model
- `generated/prisma/models/` — DocumentCategory generated types
- Any service or route that creates, filters, or reads DocumentCategory records

**Key Changes:**
- Drop the `departmentId` FK referencing the local Department table
- Add `authDepartmentId String` and `departmentName String` snapshot fields
- On create/update, populate both fields from the auth session or caller-supplied auth department context
- Update all queries that filter by `departmentId` to filter by `authDepartmentId`

**Schema Changes:**
- Remove: `departmentId Int?` and `department Department? @relation(...)` from DocumentCategory
- Add: `authDepartmentId String` and `departmentName String`

**Risk Notes:**
- Medium risk. DocumentCategory is a reference table used to group Document Control records. Ensure all Document Control list queries that currently join through `documentCategory.department` are updated to read `authDepartmentId` directly.
- Backfill migration required: join existing DocumentCategory rows to Department to extract and store `authDepartmentId` before dropping the FK.

---

## Phase 3 — KPI and ApprovalConfig Auth User Resolution

**Goal:** Migrate KPI and ApprovalConfig services away from local user resolution so that all user lookups use authUserId as the primary key.

**Scope:**
- `services/kpiService.ts`
- `services/kpiMonthlyService.ts`
- `services/approvalConfigService.ts`
- Related API routes under `app/api/kpi/` and any approval config endpoints
- Prisma schema if KPI or ApprovalConfig models hold local user FKs

**Key Changes:**
- Audit all user lookups in the three service files; replace any query that resolves by local `userId` with a lookup or filter by `authUserId`
- If ApprovalConfig stores approver identity as a local User FK, replace with `approverAuthUserId String` and `approverName String` snapshot
- If KPI records store submitter or owner as a local User FK, apply the same snapshot pattern
- Update email resolution to prefer `authUserId`-keyed lookups consistent with the DAR approve fix applied in the prior session

**Schema Changes (if applicable):**
- KPI model: replace any `userId Int` / `user User @relation` with `authUserId String` and `userName String`
- ApprovalConfig model: replace any local user FK fields with `approverAuthUserId String` and `approverName String`
- Exact fields depend on the current schema — confirm before writing migration

**Risk Notes:**
- Highest risk phase. KPI submission and approval config are core workflow paths. A broken approver lookup will silently route approvals incorrectly or block submissions.
- Write integration tests or manual test scripts covering KPI submit and approval config resolution before deploying.
- Do not deploy Phase 3 until Phases 1 and 2 are confirmed stable in the target environment.
- Keep dual-write (authUserId + local userId) active during a transition window and remove the local FK only after verifying all read paths use authUserId.

---

## Phase 4 — DarDistribution Department Reference Decision

**Goal:** Decide whether DarDistribution retains the `departmentId -> Department` FK as a permanent business reference or migrates to an auth department key.

**Scope:**
- `prisma/schema.prisma` — DarDistribution model
- Any DAR distribution service or route that reads or writes DarDistribution department membership

**Options:**

**Option A — Keep as business reference.** DarDistribution represents an explicit business list of departments that receive a DAR. The local Department table remains the source of truth for this list. No schema change required, but the Department table cannot be fully removed.

**Option B — Migrate to authDepartmentId.** Replace `departmentId` FK with `authDepartmentId String` and `departmentName String`. Aligns with the rest of the auth identity migration and allows full reduction of the Department table later.

**Key Changes (if Option B):**
- Add `authDepartmentId String` and `departmentName String` to DarDistribution
- Remove the `departmentId` FK
- Update DAR distribution logic to populate and query by `authDepartmentId`

**Schema Changes:**
- Option A: none
- Option B: same pattern as DocumentCategory (Phase 2)

**Risk Notes:**
- Low-to-medium risk depending on chosen option. The decision should be made before beginning Phase 3 so that the full scope of Department table references is known.
- If Option A is chosen, document the Department table as a permanent business-reference table and exclude it from the reduction plan in Phase 5.

---

## Phase 5 — User and Department Table Assessment

**Goal:** After Phases 1–4 are complete, assess whether the local User and Department tables can be reduced, made read-only mirrors, or removed entirely.

**Scope:**
- `prisma/schema.prisma` — User and Department models
- `services/userService.ts`
- `repositories/userRepository.ts`
- `app/api/it/users/[id]/role/route.ts`
- `app/api/it/departments/` routes
- Any remaining model that still holds a FK to User or Department

**Key Changes:**
- Audit all remaining FKs pointing to User and Department across the full schema
- For any FK that was not converted in Phases 1–4, decide: convert to snapshot, drop entirely, or keep as intentional business data
- Evaluate the it/users role route: determine if role assignment must write to the local User table or can be fully auth-service-driven
- If User and Department are reduced to mirror-only tables, remove write logic from local services and enforce that all mutations go through the auth service

**Schema Changes:**
- Dependent on audit results from this phase
- Minimum expected: remove all Prisma relation fields on User and Department that were decoupled in prior phases, leaving only the fields needed for the mirror (e.g., `authUserId`, `authDepartmentId`, display name, role)

**Risk Notes:**
- Do not begin this phase until all prior phases are deployed and confirmed stable.
- The it/users role route may require coordination with the Auth Center service if role state moves there permanently.
- Keep the local tables in place as non-relational mirrors until the auth service is confirmed as the single source of truth for identity and role resolution.
- Final removal of local User/Department relations requires a coordinated schema migration with a maintenance window if the database is shared with other services.
