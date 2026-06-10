# AGENTS Rules Project Review

วันที่รีวิว: 2026-06-08

เอกสารนี้รีวิวทั้งโปรเจค `qms-system` เทียบกับกติกาใน `AGENTS.md` และไฟล์ `rules/*.md` โดยเขียนให้ junior อ่านแล้วเข้าใจว่าอะไรดีแล้ว อะไรยังเสี่ยง และควรแก้ลำดับไหนก่อน

## สรุปสั้น

สถานะรวม: **ผ่านบางส่วน แต่ยังไม่ควรถือว่า compliant เต็มรูปแบบ**

โปรเจคมีโครงหลักที่ดีแล้ว เช่น แยก `app/api`, `services`, `repositories`, `schemas`, `components`, ใช้ Prisma, Zod, TanStack Query หลายจุด, มี structured logger, มี Redis cache พร้อม TTL บางส่วน, มี CI build/lint และ Docker deployment

จุดที่ต้องรีบแก้คือเรื่องที่กระทบ production quality:

1. `npm run check:api` fail เพราะ `app/api/kpi/[id]/recall/route.ts` ไม่มี schema validation และ CI ยังไม่ได้รัน guardrail นี้
2. sensitive actions เช่น create, update, delete, approve, reject, recall, permission change ยังไม่มี audit trail กลางที่ searchable และ structured
3. email notification หลายจุดเป็น fire-and-forget ด้วย `.catch()` ใน API route ทำให้ retry ซ้ำแล้วส่งเมลซ้ำได้ และไม่มี delivery audit
4. database invariant บางเรื่องยังพึ่ง application code เช่น KPI ซ้ำตาม department/year แต่ schema ไม่มี `@@unique`
5. API response envelope ยังไม่สม่ำเสมอ บาง route ใช้ `{ success, data, error }` บาง route ใช้ `{ data, error }`
6. UI/i18n ยังมี hardcoded Thai/English ใน component จำนวนมาก และมี translation key ไม่ตรงกัน 1 key
7. ไม่มี test script/test files ของโปรเจค และไม่มี Prisma migrations folder
8. ops docs เช่น release rollback, backup/restore, incident/oncall runbook ยังไม่ครบ

## คำสั่งที่รันแล้ว

| Command | Result | หมายเหตุ |
|---|---:|---|
| `npm.cmd run check:api` | Fail | พบ 1 violation ที่ `app/api/kpi/[id]/recall/route.ts` |
| `npm.cmd run lint` | Pass with warnings | มี 2 warnings |
| `npx.cmd prisma validate` | Pass | Prisma schema valid |
| `npm.cmd run build` | Pass with warnings | build สำเร็จ แต่มี lint warnings เดิม |

Warnings ที่ยังเหลือ:

- `components/approve/KpiApproveActionClient.tsx:403` มี unused expression
- `components/kpi/KpiMonthlyDetailDrawer.tsx:160` มี missing dependency: `report.details`

## วิธีอ่านสถานะ

- **Pass** = ตรง rule ชัดเจน
- **Partial** = มีแนวทางถูกแล้ว แต่ยังมีช่องโหว่หรือไม่ครบ
- **Fail** = มีหลักฐานว่าไม่ตรง rule
- **Not evident** = ยังไม่พบหลักฐานใน repo ว่าทำไว้แล้ว

## Rule Compliance Matrix

| Area | Status | Evidence | อธิบายแบบ junior |
|---|---:|---|---|
| Folder structure | Partial | มี `app/api`, `services`, `repositories`, `schemas`, `hooks`, `components` ชัดเจน | โครงหลักดี แต่ยังมี direct DB ใน server pages หลายไฟล์ |
| API layering | Partial | API ส่วนใหญ่ validate/auth/service แต่ `check:api` fail 1 route | Route handler ควรบาง: auth -> validate -> call service -> response |
| API contract/versioning | Partial | มี `sendSuccess`/`handleApiError` แต่ response ไม่สม่ำเสมอ | Consumer จะเขียนยากถ้าบาง route คืน `{ success }` บาง route ไม่คืน |
| Prisma/database | Partial | `prisma validate` pass, มี indexes/unique บางจุด | ยังไม่มี migrations folder และ invariant สำคัญบางจุดไม่มี unique constraint |
| Data integrity/concurrency | Fail | KPI duplicate check อยู่ที่ service แต่ schema ไม่มี `@@unique([department, yearly])` | ถ้ากดสร้างพร้อมกัน 2 request อาจหลุด duplicate ได้ |
| Integration resilience | Partial | `lib/graphFetch.ts` มี timeout/retry, Redis มี TTL | email และ upload chunk บางจุดใช้ raw `fetch` ไม่มี timeout/retry เดียวกัน |
| Authorization | Partial | API มี `requireAuth`/`requireRole`, service มี resource checks หลายจุด | auth มีแล้ว แต่ permission matrix เป็นเอกสารยังไม่ครบ |
| Audit/compliance | Fail | ไม่พบ audit model/table/service ใน Prisma | Approval signature ไม่พอแทน audit ทุก action เช่น role change/delete/export |
| Observability/logging | Partial | มี `lib/logger.ts`, middleware สร้าง `X-Request-Id` | ยังใช้ `console.*` หลายจุด และ handler ไม่ส่ง requestId เข้า `handleApiError` |
| Health checks | Partial | `/api/health` เช็ค DB และ Redis | ยังไม่แยก liveness/readiness และ degraded ยังตอบ HTTP 200 |
| Notifications/email | Fail | หลาย route ส่งเมลแบบ `.catch(console.error)` | ถ้าส่งเมล fail หรือ request retry ไม่มี audit/outbox/dedup |
| UI state/data fetching | Partial | มี TanStack Query hooks หลายชุด | ยังมี component fetch ตรงและ useEffect fetch บางจุด |
| Forms/validation | Partial | มี Zod schemas, React Hook Form หลายจุด | ยังมี inline validation/manual fetch/any ในบาง component |
| i18n/accessibility | Fail | `messages` มี key ส่วนใหญ่ แต่ hardcoded strings เยอะ | Rule บอก no hardcoded UI strings เมื่อมี translation system |
| Testing/CI/release | Fail | CI มี lint/build/prisma validate แต่ไม่มี test และไม่รัน `check:api` | Definition of done ต้องมี lint/typecheck/test/build |
| Docker logging | Partial | compose ใช้ Loki driver, app logs stdout/stderr | ยังไม่มีเอกสาร retention/target/failure behavior ชัดเจน |
| Secrets/key rotation | Partial | `.env*` ignored, env vars อยู่ server-side | ยังไม่มีเอกสาร owner/rotation/redaction policy |
| Backup/restore | Not evident | ไม่พบ runbook backup/restore ใน docs | สำหรับระบบ QMS ต้องรู้ว่าจะ restore ยังไง |
| Incident/oncall | Not evident | ไม่พบ incident/oncall runbook ใน docs | เวลา production ล่ม คนใหม่ต้องรู้ว่าจะเช็คอะไร |
| Performance budget | Partial | list KPI/document-controls มี pagination | บาง endpoint ยัง unbounded เช่น DAR `all=true` และ IT users |

## Findings หลัก

### P1: API guardrail fail และ CI ยังไม่จับ

หลักฐาน:

- `npm.cmd run check:api` fail 1 จุด
- `app/api/kpi/[id]/recall/route.ts:12` รับ `NextRequest` แต่ไม่ parse body/query ด้วย Zod
- `.github/workflows/ci-cd.yml:44-53` รัน lint/build แต่ไม่รัน `npm run check:api`

ผลกระทบ:

- กติกา API route validation ไม่ถูก enforce
- developer อาจ merge route ที่ผิด pattern ได้ เพราะ CI ไม่ตรวจ

วิธีแก้:

1. ถ้า recall route ไม่มี body/query จริง ให้ add allowlist พร้อมเหตุผลใน `scripts/check-api-patterns.mjs`
2. ถ้ามี input ในอนาคต ให้เพิ่ม schema แล้ว `.parse()`
3. เพิ่ม `npm run check:api` เข้า CI ก่อน build

### P1: Audit trail ยังไม่ครบสำหรับระบบ enterprise

หลักฐาน:

- `prisma/schema.prisma` ไม่มี model ที่เป็น `AuditLog` หรือ business audit กลาง
- Sensitive actions มีเยอะ เช่น role change, approve, reject, recall, delete, sync, SharePoint delete
- `app/api/it/users/[id]/role/route.ts:20-40` เปลี่ยน role/department/employeeId แต่ไม่มี audit call
- `services/kpiService.ts:216-242` approve KPI แล้วเขียน signature แต่ไม่มี audit record กลาง

ผลกระทบ:

- ถ้าถามว่าใครเปลี่ยน role, ใครลบเอกสาร, ก่อน/หลังเปลี่ยนจากอะไร จะตอบยาก
- ไม่ตรง rule audit/compliance ที่ต้อง reconstruct เหตุการณ์หลังเกิดปัญหา

วิธีแก้:

1. เพิ่ม `AuditLog` model เช่น `actorUserId`, `actorRole`, `action`, `resourceType`, `resourceId`, `before`, `after`, `requestId`, `source`, `createdAt`
2. ทำ `AuditService.record(...)`
3. เรียกจาก service layer หลัง business action สำเร็จ
4. เก็บ audit แยกจาก debug log

### P1: Notification side effects ไม่ idempotent

หลักฐาน:

- `app/api/dar/[id]/approve/route.ts:84-100`, `116-122`, `129-136` ส่งเมลหลัง approve แล้ว `.catch(console.error)`
- `app/api/kpi/[id]/submit/route.ts:25-33` ส่งเมล reviewer แบบ fire-and-forget
- `app/api/kpi/[id]/recall/route.ts:27-34` ส่ง recall email ใน loop แล้ว `.catch(console.error)`

ผลกระทบ:

- ถ้า request timeout แล้ว user กดซ้ำ อาจส่งเมลซ้ำ
- ถ้าเมล fail ระบบยังตอบ success โดยไม่มี retry queue หรือ audit ว่าส่งไม่สำเร็จ
- route handler มี orchestration ที่ควรอยู่ใน service/outbox

วิธีแก้:

1. ใช้ outbox table เช่น `NotificationOutbox`
2. เขียน outbox record ใน transaction เดียวกับ state change
3. worker/job ค่อยส่งเมลและ mark `SENT/FAILED`
4. ใส่ dedup key เช่น `KPI:{id}:SUBMITTED:reviewer:{userId}`

### P1: Database invariant ยังพึ่ง application code

หลักฐาน:

- `services/kpiService.ts:70-73` เช็ค duplicate KPI ด้วย `findByDepartmentYear`
- `prisma/schema.prisma:244-262` model `KPI` ไม่มี `@@unique([department, yearly])`
- `prisma/schema.prisma:451-465` `DocumentCategory` ไม่มี unique ต่อ `departmentId + name`

ผลกระทบ:

- ถ้า request พร้อมกัน 2 ครั้ง pre-check อาจผ่านทั้งคู่
- ข้อมูล duplicate จะเกิดใน DB แล้วแก้ยากกว่า block ตั้งแต่แรก

วิธีแก้:

1. เพิ่ม unique constraint ที่ DB สำหรับ invariant สำคัญ
2. เปลี่ยน service ให้ handle Prisma unique violation เป็น `ConflictError`
3. เพิ่ม migration/backfill plan ถ้ามีข้อมูลซ้ำอยู่แล้ว

### P1: ไม่มี automated tests ของโปรเจค

หลักฐาน:

- `package.json` ไม่มี `test` script
- scan ใน `app`, `components`, `hooks`, `lib`, `services`, `repositories`, `schemas`, `types`, `errors`, `scripts` ไม่พบ `*.test.ts` หรือ `*.spec.ts`
- `.github/workflows/ci-cd.yml` ไม่มี test step

ผลกระทบ:

- Critical workflows เช่น DAR approve, KPI approve/reject/recall, role change, sync users ไม่มี regression safety net
- Build pass ไม่ได้แปลว่า business rules ถูก

วิธีแก้:

1. เริ่มจาก unit tests ให้ service state transitions
2. เพิ่ม integration tests ให้ route validation/error envelope
3. เพิ่ม test script เข้า `package.json` และ CI

### P2: Direct DB access อยู่ใน server pages หลายไฟล์

หลักฐาน:

- `app/(dashboard)/page.tsx:3` import `db`
- `app/(dashboard)/page.tsx:34-81` query Prisma หลาย query ใน page
- พบ direct `db` ใน `app/(dashboard)/(user)/dar/[id]/page.tsx`, `app/(dashboard)/qms/document-controls/*`, `app/print/dar/[id]/page.tsx` และอื่น ๆ

ผลกระทบ:

- page เริ่มมี query/business shape เอง ทำให้ reuse/test ยาก
- boundary ระหว่าง UI route กับ data layer ไม่ชัด

วิธีแก้:

1. ย้าย query shape ไป repository/service
2. ให้ page เรียก service method เช่น `DashboardService.getDashboardData(user)`
3. page เหลือ auth + call service + render

### P2: API response envelope ยังไม่สม่ำเสมอ

หลักฐาน:

- `lib/apiResponse.ts:17-31` success envelope คือ `{ success, message, data, meta }`
- `lib/apiErrorHandler.ts:21-83` error envelope คือ `{ success: false, error: { message, code } }`
- แต่หลาย route ใช้ `NextResponse.json({ data, error })` เช่น:
  - `app/api/it/users/[id]/role/route.ts:26`, `40`
  - `app/api/it/users/[id]/block-session/route.ts:28-37`
  - `app/api/sharepoint/delete-item/route.ts:18-29`
  - `app/api/ms-graph/users/search/route.ts:35-52`

ผลกระทบ:

- Frontend ต้องเขียน parser หลายแบบ
- External consumer ไม่รู้ contract ที่แน่นอน

วิธีแก้:

1. บังคับใช้ `sendSuccess` และ `handleApiError` ทุก route ยกเว้น binary/proxy response
2. ทำ helper สำหรับ validation error แบบเดียวกัน
3. เพิ่ม static check หา `NextResponse.json({ data:` ใน `app/api`

### P2: Health check ยังไม่พร้อมเป็น readiness จริง

หลักฐาน:

- `app/api/health/route.ts:48-60` คืน `status: "ok" | "degraded"` แต่ไม่ได้ set HTTP status
- Docker healthcheck ใช้ `wget -qO- .../api/health || exit 1` ที่ `Dockerfile:42-43` และ `docker-compose.yml:43-48`

ผลกระทบ:

- ถ้า DB/Redis fail แต่ endpoint ยัง HTTP 200, container healthcheck อาจยังมองว่า healthy
- ยังไม่แยก liveness กับ readiness

วิธีแก้:

1. ทำ `/api/health/live` สำหรับ process alive
2. ทำ `/api/health/ready` สำหรับ DB/Redis readiness และคืน 503 เมื่อ critical dependency fail
3. ให้ Docker healthcheck ใช้ readiness endpoint

### P2: Logging มีฐานดี แต่ยังไม่สม่ำเสมอ

หลักฐาน:

- `lib/logger.ts:16-34` เขียน JSON structured logs
- `middleware.ts:65-89` สร้าง `X-Request-Id`
- แต่มี `console.error`/`console.log` ตรงใน API/service หลายจุด เช่น `services/email.ts:22-25`, `services/darService.ts:736-740`
- `handleApiError(error)` ส่วนใหญ่ไม่ได้ส่ง context/requestId

ผลกระทบ:

- debug production issue ยาก เพราะ log บางจุดไม่มี requestId/resource/action
- email log แสดง sender/recipient email ซึ่งควรพิจารณาว่าเป็น sensitive operational data หรือไม่

วิธีแก้:

1. ใช้ `logger` แทน `console.*` ใน application code
2. route ดึง `x-request-id` แล้วส่งเข้า `handleApiError(error, context)`
3. กำหนด log redaction policy สำหรับ email/token/payload

### P2: Integration resilience ยังไม่ครบทุก path

หลักฐาน:

- `lib/graphFetch.ts:49-101` มี timeout/retry สำหรับ Graph API ดีแล้ว
- `services/sharepoint.ts:238-246` upload chunk ใช้ raw `fetch` กับ `uploadUrl`
- `services/email.ts:40-47` send mail ใช้ raw `fetch`

ผลกระทบ:

- บาง integration path ไม่มี timeout/retry/backoff แบบเดียวกัน
- error behavior ไม่เหมือนกันและสังเกตยาก

วิธีแก้:

1. ใช้ shared fetch wrapper สำหรับ email และ resumable upload chunk
2. กำหนด timeout/retry เฉพาะ action ที่ retry ได้อย่างปลอดภัย
3. สำหรับ side effect ที่ retry อาจซ้ำ ให้ใช้ outbox/dedup ก่อน

### P2: Pagination ยังไม่ครอบคลุมทุก endpoint

หลักฐาน:

- `app/api/dar/route.ts:19-21` privileged user ส่ง `all=true` แล้ว `getAllDars()`
- `app/api/it/users/route.ts:15-20` คืน users ทั้งหมด
- `repositories/userRepository.ts:32-45` `findManyWithDept()` ไม่มี pagination

ผลกระทบ:

- เมื่อ data โต endpoint จะช้าขึ้นและกิน memory
- UI list จะโหลดมากเกินจำเป็น

วิธีแก้:

1. เพิ่ม pagination/filter/sort ใน IT users
2. เลิกใช้ `all=true` หรือจำกัด `take` ชัดเจนพร้อมเหตุผล
3. ให้ frontend query เป็น server-side pagination

### P2: i18n ยัง drift จาก rule

หลักฐาน:

- `messages/th.json` มี 757 keys, `messages/en.json` มี 758 keys
- missing Thai key: `dar.approval.sigImageAlt`
- มี hardcoded locale branches จำนวนมาก เช่น `components/it/ItUserTable.tsx:87-144`, `components/layout/DashboardHeader.tsx:35-69`, `components/dar/(user)/DarListClient.tsx:134-209`

ผลกระทบ:

- แก้ข้อความยาก ต้องไล่ component แทนแก้ที่ messages
- translation consistency ตรวจยาก

วิธีแก้:

1. ย้าย visible UI text เข้า `messages/th.json` และ `messages/en.json`
2. ใช้ `useT()` แทน local `locale === "th" ? ... : ...`
3. เพิ่ม script เช็ค key parity ระหว่าง th/en

### P2: UI primitive rules ยังไม่ครบ

หลักฐาน:

- มี native `<select>` หลายจุด เช่น `components/announcements/AnnouncementCreateDrawer.tsx:93`, `components/it/ItUserTable.tsx:451`, `components/qms/ApprovalConfigClient.tsx:78`
- `components/dar/DarAttachmentUpload.tsx:479` ใช้ native `confirm("...")`
- แต่ก็มี Radix primitives ใน `components/ui/dialog.tsx`, `components/ui/select.tsx`, และหลาย component ใช้ Dialog/Select ถูกทางแล้ว

ผลกระทบ:

- UX/accessibility ไม่สม่ำเสมอ
- destructive confirm ควรเป็น modal ที่ควบคุมข้อความ/สถานะได้

วิธีแก้:

1. แทน native select ด้วย `components/ui/select`
2. แทน `confirm()` ด้วย `ConfirmModal` หรือ Radix Dialog
3. ใส่ accessible label/aria state ให้ icon-only actions

### P3: Prisma migrations และ release docs ยังไม่พร้อม

หลักฐาน:

- `prisma/` มี `schema.prisma` แต่ไม่พบ `prisma/migrations`
- `package.json` มี `db:migrate`, `db:push` แต่ไม่มี migration history ใน repo
- ไม่พบ docs เฉพาะสำหรับ backup/restore, incident/oncall, release rollback

ผลกระทบ:

- production rollout/rollback เสี่ยง เพราะไม่มี history และ restore procedure
- junior หรือ on-call คนใหม่ไม่รู้ขั้นตอนเมื่อ deploy fail หรือ data เสีย

วิธีแก้:

1. ใช้ Prisma migrations เป็น source of truth สำหรับ schema changes
2. เขียน `docs/release-runbook.md`
3. เขียน `docs/backup-restore-runbook.md`
4. เขียน `docs/incident-oncall-runbook.md`

## สิ่งที่ทำได้ดีแล้ว

1. โครง repo อ่านง่ายและสอดคล้องกับ folder contract โดยรวม
2. API routes ส่วนใหญ่มี auth, schema validation, service call, error handler
3. มี guardrail script `scripts/check-api-patterns.mjs` สำหรับตรวจ API pattern
4. มี `sendSuccess` และ `handleApiError` เป็นจุดเริ่มต้นของ API contract
5. Prisma schema valid และมี relation/index/unique หลายจุด เช่น `User.email`, `DarMaster.darNo`, `KPIMonthlyReport(kpiId, month, year)`
6. Service สำคัญหลายจุดใช้ transaction และส่ง `tx` เข้า repository
7. KPI/DAR approval มี resource-level checks ใน service เช่น assigned reviewer/approver
8. `lib/graphFetch.ts` มี timeout/retry/backoff สำหรับ Graph API
9. Redis usage หลายจุดมี TTL และ fallback comment
10. Docker run ด้วย non-root user และ log ออก stdout/stderr ได้

## แผนแก้แบบเรียงลำดับ

### Phase 1: ทำให้ guardrail และ release gate เชื่อถือได้

1. Fix หรือ allowlist `app/api/kpi/[id]/recall/route.ts`
2. เพิ่ม `npm run check:api` เข้า CI
3. เพิ่ม `test` script แม้เริ่มจาก service unit test ชุดเล็ก
4. แก้ lint warnings 2 จุด

### Phase 2: ปิด risk ของ audit, idempotency, notification

1. เพิ่ม `AuditLog` model และ `AuditService`
2. เพิ่ม notification outbox/dedup key
3. ย้าย email orchestration ออกจาก API route ไป service/outbox
4. เพิ่ม audit ให้ role change, approve, reject, recall, delete, sync, SharePoint actions

### Phase 3: แข็งแรงเรื่อง database และ API contract

1. เพิ่ม unique constraints ที่เป็น domain invariant
2. เพิ่ม Prisma migrations และ migration policy
3. normalize response envelope ทุก route
4. เพิ่ม pagination ให้ endpoints ที่ยัง unbounded

### Phase 4: Cleanup frontend และ ops docs

1. ย้าย hardcoded UI strings เข้า messages
2. แทน native select/confirm ด้วย Radix primitives
3. แยก health live/ready
4. เขียน release, backup/restore, incident/oncall runbooks

## Checklist สำหรับ junior เวลาแก้ feature ใหม่

ก่อนเปิด PR ให้เช็คแบบนี้:

1. Route อยู่ใน `app/api` และบางพอหรือยัง
2. Input ทุกตัวผ่าน Zod schema หรือยัง
3. Business logic อยู่ใน service หรือยัง
4. Query DB อยู่ใน repository หรือยัง
5. Action สำคัญมี permission check ระดับ resource หรือยัง
6. Action สำคัญมี audit record หรือยัง
7. ถ้ามี email/SharePoint/Graph/Redis มี timeout/retry/failure behavior หรือยัง
8. ถ้ากดซ้ำหรือ retry จะ duplicate data/email หรือไม่
9. List endpoint มี pagination/filter/sort หรือยัง
10. UI text อยู่ใน `messages/th.json` และ `messages/en.json` หรือยัง
11. Error toast ไม่ auto-dismiss หรือยัง
12. มี test ที่กัน regression ของ business rule หรือยัง
13. CI ต้องรัน lint, check:api, test, build หรือยัง
14. ถ้าเปลี่ยน DB มี migration และ rollback/backfill note หรือยัง

## ข้อสรุป

โปรเจคนี้มี foundation ดีและ build ผ่าน แต่ยังไม่ตรง AGENTS rules เต็มระดับ enterprise เพราะขาด audit trail, test coverage, idempotent notification design, API contract consistency, migration history และ ops runbooks

ลำดับแก้ที่คุ้มที่สุดคือ **ทำ CI ให้จับ rule violation ก่อน**, ต่อด้วย **audit/outbox/idempotency**, แล้วค่อย cleanup layering, API envelope, i18n และ ops docs
