# Codex System Evaluation Report

วันที่ประเมิน: 2026-05-30
โปรเจกต์: `qms-system` (Next.js App Router + Prisma + Tailwind)

## 1) Executive Summary

ภาพรวมระบบอยู่ในระดับ **ใช้งาน production ได้** และมีรากสถาปัตยกรรมที่ดี (แยกชั้น, มี repository/service, มี response/error utility, มี i18n, มี RBAC) แต่ยังมี **architectural drift** หลายจุดที่ถ้าปล่อยไว้จะเพิ่มต้นทุน maintenance และเสี่ยง bug ข้ามโมดูลในระยะกลาง

คะแนนภาพรวม (เชิงสถาปัตย์และมาตรฐานภายใน): **7.4 / 10**

- จุดแข็งเด่น: โครงสร้างโมดูลชัด, domain coverage ครบ, มี transaction usage จำนวนมาก, มี design system token ใช้จริง
- จุดเสี่ยงหลัก: API บางส่วนยัง query DB ตรงใน route, Service บางตัว bypass repository, data-fetching ฝั่ง UI ยังไม่ standardized ตาม TanStack Query policy, i18n ยังมี hardcoded string บางส่วน

---

## 2) สิ่งที่ทำได้ดี (Keep)

### 2.1 Layering พื้นฐานและโครงสร้างโมดูล

- แยกโฟลเดอร์ชัดเจน: `app/api`, `services`, `repositories`, `schemas`, `lib`, `components`
- มี Base Repository pattern และ transaction-aware client
  - อ้างอิง: `repositories/baseRepository.ts`
- มี error/response standard utility ใช้จริง
  - อ้างอิง: `lib/apiErrorHandler.ts`, `lib/apiResponse.ts`

### 2.2 API มาตรฐานจำนวนมากเป็นไปตามแนวทาง

- พบ API route ทั้งหมดประมาณ **63 ไฟล์**
- route ที่ใช้ `handleApiError(...)` ประมาณ **49 ไฟล์**
- route ที่ใช้ `sendSuccess(...)` ประมาณ **42 ไฟล์**
- route หลายตัวเป็น thin-controller ที่ดี (validate -> service -> success)
  - ตัวอย่างดี: `app/api/document-controls/route.ts`, `app/api/announcements/route.ts`

### 2.3 Frontend foundation ดี

- มี `QueryProvider` และใช้งาน TanStack Query อยู่จริง
  - อ้างอิง: `components/common/QueryProvider.tsx`
- มี responsive table/card fallback หลายจอที่สอดคล้อง guideline
  - ตัวอย่าง: `components/kpi/KpiMasterTable.tsx`, `components/document-control/DocumentControlListClient.tsx`, `components/dar/DarTable.tsx`
- Radix-based UI primitives มีครบระดับใช้งานองค์กร
  - `components/ui/*`

### 2.4 Operational concerns มีการคิดไว้แล้ว

- มี Redis usage (cache / blocklist / token lock)
- มี Graph retry/timeout utility
- มี health endpoint

---

## 3) จุดที่ควรแก้ไข (Fix)

## P0 (ควรทำก่อน)

### 3.1 Route Handlers ยัง query DB โดยตรง

ผิดจากกติกา “No DB in API Route” และเพิ่ม coupling ระหว่าง transport layer กับ data layer

- พบ route ที่ import `@/lib/db` ใน `app/api` ประมาณ **12 ไฟล์**
- ตัวอย่าง:
  - `app/api/qms/approval-config/route.ts`
  - `app/api/announcements/ticker/route.ts`
  - `app/api/it/sync-departments/route.ts`
  - `app/api/dar/[id]/attachments/route.ts`
  - `app/api/sharepoint/preview-proxy/route.ts`

ผลกระทบ:
- test ยากขึ้น
- business rule กระจายในหลายชั้น
- refactor schema/model มี blast radius สูง

ข้อเสนอ:
1. ย้าย query ทั้งหมดออกจาก route ไป service/repository
2. route เหลือเฉพาะ auth + parse + call service + response

### 3.2 Service บางโมดูลยัง bypass repository

พบ service ที่ import/use `db` ตรงอย่างน้อย **5 ไฟล์**
- `services/darService.ts`
- `services/documentControlService.ts`
- `services/documentCategoryService.ts`
- `services/kpiService.ts`
- `services/kpiMonthlyService.ts`

ผลกระทบ:
- service กลายเป็นทั้ง domain + data access
- transaction consistency และ reuse repository rule ไม่สม่ำเสมอ

ข้อเสนอ:
1. สร้าง repository method ที่ขาด
2. service เรียกผ่าน repository เท่านั้น
3. คง `db.$transaction` ไว้ได้ แต่ภายในต้องเรียก repo โดยส่ง `tx`

### 3.3 Lint ยัง fail (ต้องผ่านก่อนปล่อย)

ผล `npm run lint`:
- **4 errors** (`no-explicit-any`):
  - `services/kpiMonthlyService.ts` (2 จุด)
  - `services/kpiService.ts` (2 จุด)
- **3 warnings** unused vars

ข้อเสนอ:
1. แทน `any` ด้วย typed DTO/Prisma payload type
2. ตัด unused imports/vars
3. ตั้ง CI gate ให้ lint ต้องผ่านเสมอ

## P1 (ควรทำถัดมา)

### 3.4 Frontend data-fetching ยังไม่ standardized ตาม policy

แม้มี TanStack Query แต่ยังพบการ `fetch()` ตรงใน `components/` และ `hooks/` จำนวนมาก
- พบ `fetch(` ใน `components`+`hooks` ประมาณ **96 จุด**
- ตัวอย่างที่ยังใช้ imperative fetch / `.then()`:
  - `components/layout/AnnouncementTicker.tsx`

ผลกระทบ:
- cache/invalidation ไม่สม่ำเสมอ
- handling loading/error ซ้ำและกระจัดกระจาย

ข้อเสนอ:
1. บังคับ data layer ผ่าน `hooks/api/*` ที่ใช้ Query/Mutation
2. หยุดใช้ `.then().catch()` ใน client async flow
3. กำหนด query key convention กลาง

### 3.5 i18n ยังไม่ strict 100%

พบ hardcoded/inline string บางจุด (ไทย/อังกฤษ) และการสลับข้อความด้วย ternary ใน component
- ตัวอย่าง:
  - `components/dashboard/PostAnnouncementModal.tsx` (`alert("Failed to post announcement.")`)
  - `components/dar/DarPrintTemplate.tsx` (literal string ปริมาณมาก)

ข้อเสนอ:
1. ย้าย string ไป `messages/th.json` + `messages/en.json`
2. ใช้ `t('key')` เท่านั้นใน UI layer

### 3.6 UX/Error handling consistencyฆ

พบการใช้ `alert()` หลายจุดแทน toast/modal pattern
- ตัวอย่าง:
  - `components/dashboard/PostAnnouncementModal.tsx`
  - `components/dashboard/AnnouncementForm.tsx`
  - `components/dar/SignaturePad.tsx`

ข้อเสนอ:
1. แทนที่ด้วย Sonner toast หรือ confirm modal ตามประเภท action
2. error toast ให้ `duration: Infinity` ตาม policy เฉพาะกรณี error

---

## 4) สิ่งที่ควรเพิ่ม (Add)

### 4.1 Architecture Guardrails (แนะนำเพิ่มทันที)

1. เพิ่ม ESLint custom rule/ban import
- ห้าม import `@/lib/db` ใน `app/api/**`
- ห้าม import `@/lib/db` ใน `services/**` (ยกเว้นไฟล์ infra ที่กำหนด)

2. เพิ่ม static check script
- ตรวจ route ที่ไม่มี `handleApiError`
- ตรวจ route ที่ไม่มี schema validation

3. เพิ่ม API template/snippet มาตรฐาน
- ลดการ copy pattern ผิด

### 4.2 Test Strategy ที่ยังขาด

1. Repository integration tests (กับ test DB)
2. Service unit tests สำหรับ approval flow/DAR/KPI transitions
3. API contract tests สำหรับ route สำคัญ
4. E2E smoke tests สำหรับ flow:
- DAR create -> submit -> review -> approve
- KPI monthly submit/review/approve/reject

### 4.3 Observability เพิ่มเชิง production

1. Request ID propagation ทุก route
2. Structured logs + userId/module/action
3. Metrics:
- latency per endpoint
- error rate by code
- external dependency latency (Graph/SharePoint)

### 4.4 Performance/Scalability

1. กำหนด pagination policy ให้ทุก list API
2. ทบทวน query select/include เพื่อลด over-fetching
3. แยก cache key strategy ชัดเจนสำหรับ dashboard/high-traffic widgets

---

## 5) Recommended Execution Plan (2 สัปดาห์)

### Phase 1 (วัน 1-3)
1. แก้ lint errors/warnings ให้ผ่าน
2. ตัด `alert()` -> toast/modal
3. เก็บ quick wins i18n hardcoded strings

### Phase 2 (วัน 4-8)
1. Refactor P0 routes ที่ DB ตรง -> service/repository
2. Refactor service ที่ query DB ตรง -> repository methods
3. เพิ่ม lint guardrails (ban import)

### Phase 3 (วัน 9-14)
1. Standardize TanStack Query usage
2. เพิ่ม test coverage flow หลัก
3. เพิ่ม observability baseline

---

## 6) สรุปเชิงผู้บริหาร

ระบบนี้มีฐานที่ดีและวางแนวทางถูกทิศแล้ว แต่ยังมี gap เรื่องการบังคับใช้มาตรฐานให้สม่ำเสมอทั้ง backend และ frontend หากปิด P0/P1 ตามแผน จะลดความเสี่ยง regression ได้ชัดเจน, เพิ่มความเร็วทีมในการเพิ่มฟีเจอร์, และทำให้ระบบพร้อม scale สำหรับ enterprise workflow ที่ซับซ้อนขึ้น
