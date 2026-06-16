# CAR Task Log

## Phase 1  Database & Schema
- [x] @4H! enum: `CarStatus`, `CarSourceType`, `VerificationResult`
- [x] @4H! `CAR` C enum `ApprovalModule`
- [x] *#I2 model: `CarMaster`, `CarResponse`, `CarVerification`, `CarMrSignature`, `CarAttachment`, `CarNotificationLog`
- [x] #1 `prisma db push` + `prisma generate`
- [x] -1@ `docs/architecture/database-map.md`

## Phase 2  Backend: Repository + Service
- [x] `carSequenceRepository.ts`  nextSequence with SystemConfig lock
- [x] `carRepository.ts`  CRUD + list filter + relations
- [x] `carService.ts`  createCar, issueCar, respondToCar, verifyCar, closeCar, createReCar
- [x] `carEmailService.ts`  email templates for all events
- [x] `lib/validations/car.ts`  Zod schemas
- [ ] `carReminderService.ts`  Redis-based email reminder scheduler (PENDING)

## Phase 3  API Routes
- [x] `GET/POST /api/car`
- [x] `GET/PATCH/DELETE /api/car/[id]`
- [x] `POST /api/car/[id]/issue`
- [x] `POST /api/car/[id]/respond`
- [x] `POST /api/car/[id]/verify`
- [x] `POST /api/car/[id]/close`
- [x] `POST /api/car/[id]/re-car`
- [x] `GET /api/car/next-number`
- [x] -1@ `docs/architecture/api-map.md`

## Phase 4  Frontend: Components
- [x] `CarStatusBadge.tsx`
- [x] `CarFormDrawer.tsx` (Create/Edit)
- [x] `CarFormDrawerTrigger.tsx`
- [x] `CarIssueDialog.tsx`
- [x] `CarRespondForm.tsx` + `CarRootCauseCheckbox.tsx`
- [x] `CarVerifyForm.tsx`
- [x] `CarTimeline.tsx`
- [x] `CarAttachmentUpload.tsx`
- [x] `CarMrSignDialog.tsx`
- [x] `CarListTable.tsx`
- [x] `CarDetailClient.tsx`

## Phase 5  Frontend: Pages
- [x] `/qms/car/page.tsx` (QMS list)
- [x] `/qms/car/[id]/page.tsx` (QMS detail)
- [x] `/(user)/car/page.tsx` (user list  dept filtered)
- [x] `/(user)/car/[id]/page.tsx` (user detail + respond)
- [x] `/approve/car/[id]/mr/page.tsx` (MR token sign page)
- [x] @4H! link C `DashboardSidebar.tsx`

## Phase 6  Email & Notifications
- [x] Email template: ISSUED (AIA)
- [x] Email template: REMINDER (8 3 '1)
- [x] Email template: RESPONDED (AI MR + QMS)
- [x] Email template: VERIFY_PASS (AI MR %2! + ActionToken link)
- [x] Email template: VERIFY_2_NOTIFY (AIA  #1I5H 2)
- [x] Email template: RE_CAR (AIA  	1C+!H)
- [ ] Implement Redis reminder job runner (PENDING)

## Phase 7  Testing & E2E
- [ ] Unit test: carSequenceRepository (race condition)
- [ ] Unit test: carService (verifyCar PASSED/FAILED branching)
- [ ] E2E: Full CAR flow (issue ï¿½ respond ï¿½ verify1 PASS ï¿½ MR sign)
- [ ] E2E: Full CAR flow (issue ï¿½ respond ï¿½ verify1 FAIL ï¿½ verify2 FAIL ï¿½ Re-CAR)

## Phase 8  Documentation
- [x] -1@ `docs/agent/01-current-state.md`
- [x] -1@ `docs/agent/04-task-log.md`
- [x] -1@ `docs/architecture/database-map.md`
- [x] -1@ `docs/architecture/api-map.md`
- [x] -1@ `docs/architecture/dependency-map.md`
- [x] -1@ `docs/domains/car/overview.md`

## Phase 9  MS Graph UI Integration
- [x] @4H! `searchEntraGroups()` C `services/ms-graph.ts`
- [x] *#I2 `GET /api/ms-graph/groups/search` route
- [x] *#I2 `components/shared/GraphUserPicker.tsx`  reusable MS Graph user combobox
- [x] *#I2 `components/shared/GraphGroupPicker.tsx`  reusable MS Graph group combobox
- [x] -1@ `CarFormDrawer.tsx`: 9I-- CAR @%7-2 MS Graph (auto-fill 3A+H2 jobTitle), Email Group @%7-2 MS Graph groups
- [x] -1@ `lib/validations/car.ts`: @4H! optional `issuerId` field
- [x] -1@ `app/api/car/route.ts`: #-#1 `issuerId` override 2 body
- [x] Audited CAR module against the updated API and UI rules; identified service-layer Prisma usage, enterprise table gaps, and MR sign UI standard gaps.

- [x] Implemented CAR hardening from audit: GET /api/car pagination/search/filter contract, CarListTable URL-bound enterprise list UI with mobile cards, repository-owned CAR write paths, and Vitest coverage for CAR service list/issue flows.
- [x] Updated CAR detail page access props to prefer `authDepartmentId` over local `departmentId`, aligning USER department checks with Auth Center-scoped department IDs after identity decoupling.
