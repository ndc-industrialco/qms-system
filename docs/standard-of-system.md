# Standard of System - QMS System

**Project:** QMS System  
**Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, Tailwind CSS, Radix UI, TanStack Query, Microsoft Graph/SharePoint  
**Purpose:** รายงานประเมินสิ่งที่ระบบทำได้ดี สิ่งที่ยังควรปรับ และสรุปเป็นมาตรฐานสำหรับใช้พัฒนาต่อ

---

## 1. Executive Summary

ระบบนี้มีโครงสร้างพื้นฐานที่ค่อนข้างดีสำหรับ Enterprise Internal System โดยเฉพาะการแยก backend เป็น Route Handler -> Service -> Repository, มี Zod validation, custom error handling, transaction pattern, role-based access, TanStack Query, i18n, และ integration กับ Microsoft Graph/SharePoint

จุดที่ควรยกระดับให้เป็นมาตรฐานถาวรคือความสม่ำเสมอของ API response, upload validation, preview/download security, UI/i18n enforcement, และ guardrail ใน CI ให้ตรวจได้มากกว่าแค่ห้าม DB ใน API route

---

## 2. System Structure Standard

### 2.1 สิ่งที่ดี

- โครงสร้างหลักแยกชั้นชัดเจน:
  - `app/api/...` เป็น Route Handler
  - `services/` เป็น business logic และ transaction boundary
  - `repositories/` เป็น data access layer
  - `schemas/` เป็น Zod validation
  - `errors/`, `lib/`, `types/` เป็น shared foundation
- มี `repositories/baseRepository.ts` ช่วยลด CRUD/pagination ซ้ำ และรองรับ `tx?: Prisma.TransactionClient`
- มี domain module ชัดเจน เช่น DAR, KPI, Document Control, Announcements, IT Management, Approval Queue
- มีเอกสาร `docs/tech-stack.md` และ `docs/techniques.md` เป็นฐานความรู้เดิมของระบบ

### 2.2 สิ่งที่ไม่ดี / Risk

- บาง service ยังมี business logic ขนาดใหญ่ เช่น workflow, upload, permission, mapping response อยู่ใน class เดียวกันมากเกินไป ทำให้ test และ maintain ยาก
- มี logic upload validation ซ้ำหลายที่ เช่น `lib/fileValidation.ts`, `DarService`, และ route temp attachment
- มี error class import สองแหล่ง (`@/errors/customErrors` และ `@/lib/errors`) ซึ่งเสี่ยงต่อ behavior ไม่สม่ำเสมอ
- บาง route หรือ component ยังใช้ response format เก่า `{ data, error }` ขณะที่มาตรฐานใหม่คือ `{ success, message, data, meta, error }`

### 2.3 มาตรฐานที่ต้องใช้ต่อไป

- Route Handler ต้องเป็น thin controller เท่านั้น: auth, parse input, validate, call service, return response
- Service ทำ business rule, permission, transaction, external side-effect orchestration
- Repository เป็นที่เดียวที่เขียน Prisma query
- Shared logic เช่น upload validation, file naming, response parser, error extraction ต้องอยู่ใน `lib/` หรือ service helper กลาง
- ห้ามสร้าง API response shape ใหม่ใน route เว้นแต่เป็น binary/stream response

---

## 3. API Standard

### 3.1 สิ่งที่ดี

- มี `sendSuccess()` ใน `lib/apiResponse.ts` สำหรับ success response
- มี `handleApiError()` ใน `lib/apiErrorHandler.ts` สำหรับ error response, Zod error, AppError, request id header, และ log unknown error
- มี custom errors เช่น `ValidationError`, `ForbiddenError`, `NotFoundError`, `ConflictError`
- มี `scripts/check-api-patterns.mjs` และ `npm run check:api` ตรวจ route architecture
- ผลตรวจล่าสุด: `npm run check:api` ผ่าน 64 API routes
- API หลักหลายจุดใช้ pattern ถูกต้อง เช่น `app/api/document-controls/route.ts`

### 3.2 สิ่งที่ไม่ดี / Gap

- Static check ยังไม่ตรวจ response shape ว่าต้องใช้ `sendSuccess()` หรือไม่
- Static check ยังไม่ตรวจ `.then()` / `.catch()` ใน API route ตาม async/await only policy
- บาง route ในกลุ่ม SharePoint, DAR attachment, IT sync, MS Graph ยังตอบ `{ data, error }` โดยตรง
- บาง route ใช้ inline schema แทน schema file ได้ในกรณีเล็ก ๆ แต่ถ้า route โตขึ้นจะกระจายมาตรฐาน validation
- บาง route ส่ง email แบบ fire-and-forget ด้วย `.catch()` ใน route handler ทำให้ side effect ไม่ถูก audit ผ่าน service layer

### 3.3 API Response Standard

Success response ต้องใช้:

```json
{
  "success": true,
  "message": "Resource retrieved successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

Error response ต้องใช้:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": []
  }
}
```

Exception ที่อนุญาต:

- Binary preview/download response
- Health check
- NextAuth route
- Streaming response

### 3.4 API Route Checklist

- ใช้ `requireAuth()` หรือ `requireRole()` ทุก route ที่ไม่ public
- Validate body/query/params ด้วย Zod ก่อนเรียก service
- Return ด้วย `sendSuccess()`
- Catch ด้วย `handleApiError(error, context?)`
- ห้าม import `db`, Prisma client, หรือ repository โดยตรงใน route ยกเว้น route ที่อยู่ใน allowlist ชัดเจน
- ห้าม hardcode business rule ใน route
- ห้ามใช้ `.then()` / `.catch()` ใน route ยกเว้นมีเหตุผลและมี comment/allowlist

---

## 4. Upload Standard

### 4.1 สิ่งที่ดี

- Document Control upload ตรวจครบทั้ง file required, metadata required, file size, allowed MIME, และ magic bytes
- มี `MAX_FILE_SIZE = 20MB` และ allowed MIME list
- SharePoint upload อยู่หลัง service/helper ไม่กระจาย Graph API ลงใน component
- Document Control มี compensation: ถ้า upload SharePoint สำเร็จแต่ DB transaction fail จะพยายามลบ orphaned SharePoint item
- DAR upload มี permission check ก่อน upload และห้ามแก้ไฟล์เมื่อสถานะ completed/cancelled

### 4.2 สิ่งที่ไม่ดี / Gap

- Temp DAR upload ตรวจ MIME/size แต่ยังไม่ได้ใช้ magic bytes จาก `lib/fileValidation.ts`
- KPI monthly attachment ใช้ schema ตรวจ metadata แต่จาก route ที่เห็นยังไม่ชัดว่าตรวจ magic bytes ก่อน upload หรือไม่
- Allowed MIME และ max file size ซ้ำหลายจุด ทำให้แก้มาตรฐานไฟล์แล้วหลุดบาง flow ได้
- File name sanitization มีบางจุด แต่ยังไม่เป็น helper กลาง
- ยังไม่มีมาตรฐาน antivirus/malware scan หรือ async scan queue สำหรับไฟล์ enterprise
- ยังไม่มี upload audit log กลาง เช่น uploader, module, item id, checksum, result

### 4.3 Upload Standard ที่ต้องใช้

ทุก upload flow ต้องผ่านขั้นตอนนี้:

1. Auth/role check
2. Validate route params และ metadata ด้วย Zod
3. Validate `File` existence
4. Validate file size จาก config กลาง
5. Validate MIME จาก config กลาง
6. Validate magic bytes จาก `lib/fileValidation.ts`
7. Sanitize file name ด้วย helper กลาง
8. Upload ไป external storage
9. บันทึก DB ใน transaction ถ้ามีหลาย table
10. ทำ compensation เมื่อ DB fail หลัง external upload
11. บันทึก audit log

### 4.4 Recommended Upload Helper

ควรรวม upload policy เป็น helper กลาง เช่น:

```typescript
validateUploadFile(file, {
  maxSize: MAX_FILE_SIZE,
  allowedMime: ALLOWED_MIME,
  requireMagicBytes: true,
});
```

และห้ามประกาศ `ALLOWED_MIME` ซ้ำใน route/service

---

## 5. Preview and Download Standard

### 5.1 สิ่งที่ดี

- Preview proxy ไม่ expose SharePoint download URL ให้ client ใช้โดยตรงใน flow หลัก
- `app/api/sharepoint/preview-proxy/route.ts` ตรวจ `itemId` ด้วย Zod และเรียก service เพื่อตรวจสิทธิ์ก่อน fetch file
- Office preview ใช้ Graph `/preview` endpoint สำหรับ Office embed
- Binary preview ส่ง `Content-Disposition: inline` และ `Cache-Control: private, max-age=300`
- DAR preview ตรวจ requester/assigned approver/privileged role ก่อนคืน file info

### 5.2 สิ่งที่ไม่ดี / Gap

- Office embed route ตรวจ auth แต่ยังควรมี permission check เทียบ resource ownership เหมือน preview proxy
- Preview proxy โหลดทั้งไฟล์เป็น `arrayBuffer()` ก่อนตอบ ทำให้ memory risk สำหรับไฟล์ใหญ่ ถึงแม้ upload limit ปัจจุบันอยู่ที่ 20MB
- Download/preview response ไม่ควรใช้ file name จาก user โดยตรงใน header หากยังไม่ sanitize อย่างชัดเจน
- Route SharePoint browser บางจุดยังเป็น generic file operation ซึ่งต้องคุม role และ audit ให้เข้มขึ้น

### 5.3 Preview Standard ที่ต้องใช้

- ทุก preview/download ต้องตรวจสิทธิ์กับ domain record ก่อนเข้าถึง SharePoint item
- ห้ามส่ง raw `@microsoft.graph.downloadUrl` ให้ client ถ้าไม่จำเป็น
- PDF/image ใช้ proxy stream หรือ inline response
- Office file ใช้ Graph preview URL แต่ต้องตรวจ permission ก่อนขอ embed URL
- Response header ต้องกำหนด `Content-Type`, `Content-Disposition`, และ `Cache-Control`
- ไฟล์ใหญ่ควร stream response แทน `arrayBuffer()`

---

## 6. UI and Design System Standard

### 6.1 สิ่งที่ดี

- ใช้ Tailwind + Radix UI primitive wrappers ใน `components/ui/`
- มี Button, Badge, Card, Dialog, Sheet, Select, Table, Input, Textarea, Skeleton, Pagination เป็น base components
- Visual tokens ส่วนใหญ่ตรง NDC standard เช่น `#0F1059`, `rounded-2xl`, white cards, soft shadow
- Data screen หลายจุดมี desktop table และ mobile card fallback เช่น approval, DAR, KPI, document control
- มี reusable state components เช่น EmptyState, ErrorComponent, ConfirmModal, Skeleton
- Toast error รองรับ no auto-dismiss ผ่าน `duration === 0`

### 6.2 สิ่งที่ไม่ดี / Gap

- ยังมี hardcoded className ยาวซ้ำหลายจุด แทนที่จะใช้ component variants หรือ shared layout component
- บาง component ใช้ raw SVG icon แทน lucide icon
- มี raw fetch ใน component หลายจุด ไม่ได้รวมเป็น query/mutation hook เสมอ
- มี custom toast และ Sonner dependency พร้อมกัน อาจทำให้ notification standard แยกสองระบบ
- i18n ส่วนใหญ่ดี แต่ยังมี hardcoded UI/API text บางจุด โดยเฉพาะ legacy/utility/component ขนาดเล็ก
- ยังไม่มี automated UI lint ที่ตรวจ `dark:`, hardcoded string, missing mobile card fallback, missing focus ring

### 6.3 UI Standard ที่ต้องใช้

- Light mode only: ห้ามใช้ `dark:`
- Primary brand ใช้ `#0F1059`, hover `#161875`
- Card ใช้ `bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
- Button/Input ใช้ `rounded-xl` และ touch target อย่างน้อย `h-11 min-w-[44px]`
- Complex UI ต้องใช้ Radix primitives
- Data table ต้องมี mobile card fallback ต่ำกว่า `lg`
- Destructive action ต้องใช้ ConfirmModal/Dialog ห้ามใช้ toast เป็น confirmation
- Status ห้ามใช้สีอย่างเดียว ต้องมี label หรือ marker เช่น Approved / Rejected / Pending
- UI text ต้องผ่าน `t()` และอยู่ใน `messages/th.json`, `messages/en.json`

---

## 7. Data Fetching Standard

### 7.1 สิ่งที่ดี

- มี TanStack Query เป็น dependency และใช้งานจริงใน hooks/components
- มี `components/common/QueryProvider.tsx` กำหนด default query behavior
- มี hooks เฉพาะ domain เช่น `hooks/api/use-kpi.ts`, `hooks/api/use-kpi-monthly.ts`, `hooks/api/use-dar.ts`
- มี query invalidation หลัง mutation ในหลายจุด

### 7.2 สิ่งที่ไม่ดี / Gap

- ยังมี raw fetch ใน component และ custom hooks นอก `hooks/api/`
- Response parser ของ client ยังไม่เป็นมาตรฐานเดียว ทำให้บาง hook คาด `{ data, error }` แต่ API ใหม่มี `success`
- Error extraction ยังไม่รวมศูนย์ทุก flow

### 7.3 Data Fetching Standard ที่ต้องใช้

- Component ไม่ควร fetch API โดยตรง ยกเว้น isolated interaction ที่เล็กมาก
- Query/mutation ต้องอยู่ใน `hooks/api/` หรือ module-specific hook
- ต้องมี shared API client/parser ที่เข้าใจ response shape มาตรฐาน
- Mutation ต้อง invalidate query key ที่เกี่ยวข้อง
- Loading, empty, error state ต้องมีทุก data screen

---

## 8. Security and Permission Standard

### 8.1 สิ่งที่ดี

- ใช้ NextAuth v5 กับ Microsoft Entra ID
- Middleware มี auth guard, role guard, rate limit, request id, JWT blocklist
- API ใช้ `requireAuth()` และ `requireRole()` หลายจุด
- DAR service มี resource-level permission สำหรับ requester/assigned approver/privileged role
- SharePoint preview proxy ตรวจสิทธิ์ก่อนอ่านไฟล์ใน flow DAR

### 8.2 สิ่งที่ไม่ดี / Gap

- Middleware path-level role guard ยังไม่แทน resource-level permission ใน service ได้ ต้องรักษาทั้งสองชั้น
- Rate limit response ยังใช้ `{ data, error }` ไม่ตรง API standard
- SharePoint generic routes ต้องระวังการเปิด file browser/delete/create folder ให้ role กว้างเกินไป
- ยังไม่เห็น centralized audit log สำหรับ approval/upload/delete/role changes แบบครบถ้วน

### 8.3 Security Standard ที่ต้องใช้

- Middleware ใช้เป็น first gate เท่านั้น
- Service ต้องตรวจ resource ownership/role ซ้ำทุก action สำคัญ
- Upload, preview, delete, approve, reject, role change ต้องมี audit log
- API ทุก response ควรแนบ `X-Request-Id`
- Error 500 ห้าม leak internal message
- Generic SharePoint operation ต้องจำกัด role และ validate path/item id

---

## 9. Database and Transaction Standard

### 9.1 สิ่งที่ดี

- Repository รองรับ transaction client
- Service หลายจุดใช้ `db.$transaction(async (tx) => ...)`
- Workflow เช่น DAR/KPI/Document Control มี state transition และ approval records
- External side effect บาง flow มี compensation strategy

### 9.2 สิ่งที่ไม่ดี / Gap

- External side effect เช่น SharePoint move/delete ไม่สามารถ rollback ด้วย DB transaction ได้ ต้องมี reconciliation/audit ชัดเจน
- บาง service ใช้ `Promise.allSettled` แล้ว log failure แต่ไม่ได้ส่งผลลัพธ์ให้ caller ตัดสินใจเสมอ
- ยังควรแยก state machine / workflow rule ออกจาก service ขนาดใหญ่ในบาง domain

### 9.3 Transaction Standard ที่ต้องใช้

- DB write หลาย table ต้องอยู่ใน transaction
- ทุก repository method ที่ใช้ใน transaction ต้องรับ `tx`
- External upload ควรทำก่อน DB write เฉพาะกรณีที่มี compensation delete ได้
- External move/delete ที่ rollback ยาก ต้องมี audit/reconciliation record
- State transition ต้องอยู่ใน service/state-machine ไม่กระจายตาม route/component

---

## 10. Internationalization Standard

### 10.1 สิ่งที่ดี

- มี `messages/th.json` และ `messages/en.json`
- มี `lib/i18n.ts` และ locale context
- UI หลายจุดใช้ `t("key")`
- รองรับ Thai/English เป็น requirement หลักของระบบ

### 10.2 สิ่งที่ไม่ดี / Gap

- ยังมี hardcoded strings ใน component, route message, placeholder, toast, และ fallback text บางจุด
- API message ยังเป็น English hardcoded เป็นส่วนใหญ่
- เอกสารเดิมบางไฟล์ใน PowerShell output แสดง encoding เพี้ยน ควรยืนยันว่าไฟล์ทั้งหมดเป็น UTF-8

### 10.3 i18n Standard ที่ต้องใช้

- UI text ห้าม hardcode
- Translation key ต้องจัดกลุ่มตาม module เช่น `dar.*`, `kpi.*`, `documentControl.*`
- ปุ่ม/ตาราง/form ต้องใช้ padding ยืดหยุ่น ห้าม fixed width ที่ทำให้ภาษาไทยล้น
- Error text ฝั่ง UI ต้อง map จาก error code หรือ fallback translation
- ไฟล์เอกสารและ JSON ต้องเป็น UTF-8

---

## 11. Observability and CI Standard

### 11.1 สิ่งที่ดี

- มี `lib/logger.ts`
- `handleApiError()` log เฉพาะ unexpected/server error และ validation warning
- Middleware สร้าง `X-Request-Id` และ log request
- มี `npm run check:api`
- มี ESLint และ custom rule concept ในเอกสาร/ไฟล์ config

### 11.2 สิ่งที่ไม่ดี / Gap

- `check:api` ยังเป็น allowlist-based และตรวจได้เฉพาะบาง rule
- ยังไม่มี CI gate ที่ตรวจ upload standard, response shape, hardcoded UI text, หรือ `.catch()` policy
- Request logging ใน middleware log 200 ก่อน route execute จริงสำหรับ API จึงไม่ใช่ final status ของ handler
- ยังไม่เห็น metrics/tracing ที่ครบถ้วนสำหรับ production

### 11.3 CI Standard ที่ควรเพิ่ม

- `npm run lint`
- `npm run check:api`
- `npm run build`
- Static check เพิ่มเติม:
  - no `NextResponse.json({ data, error })` ใน API ยกเว้น allowlist
  - no direct `fetch()` ใน component นอก approved hooks
  - no duplicate upload policy constants
  - no `.then()` / `.catch()` ใน app/api
  - no `dark:` utility
  - no hardcoded visible UI string ใน component ใหม่

---

## 12. Priority Improvement Roadmap

### P0 - ต้องทำก่อนใช้เป็นมาตรฐานจริง

- รวม API response ให้เป็น `{ success, message, data, meta, error }`
- รวม upload validation เป็น helper กลาง และใช้ magic bytes ทุก upload flow
- รวม error class ให้เหลือ import path เดียว
- เพิ่ม permission check ให้ Office embed route เท่ากับ preview proxy
- เพิ่ม CI check สำหรับ response shape และ `.catch()` ใน API route

### P1 - ควรทำเพื่อ maintain ระยะยาว

- สร้าง shared API client/parser สำหรับ frontend
- ย้าย raw fetch ใน component ไป `hooks/api/`
- แยก workflow/state machine ออกจาก service ที่ใหญ่เกินไป
- เพิ่ม audit log กลางสำหรับ upload/delete/approval/role change
- ทำ upload/download streaming แทนโหลดทั้งไฟล์ใน memory

### P2 - ยกระดับ Enterprise Readiness

- เพิ่ม malware scan หรือ async scan queue สำหรับไฟล์ upload
- เพิ่ม metrics/tracing เช่น route latency, Graph API latency, upload failure rate
- เพิ่ม reconciliation job สำหรับ SharePoint orphan/stale DB record
- เพิ่ม UI/i18n static guardrail
- เพิ่ม test coverage สำหรับ workflow สำคัญ เช่น DAR approval, KPI monthly, document revision

---

## 13. Final Standard Checklist

ใช้ checklist นี้ก่อน merge feature ใหม่:

- API route ไม่มี DB query โดยตรง
- API route validate input ด้วย Zod
- API response ใช้ `sendSuccess()` และ `handleApiError()`
- Service ตรวจ permission และ business rule
- Repository รับ `tx` เมื่ออยู่ใน transaction
- Upload ตรวจ size, MIME, magic bytes, sanitized filename
- Preview/download ตรวจ resource permission ก่อนคืนไฟล์
- UI ใช้ base components และ Radix สำหรับ complex UI
- Data screen มี loading, empty, error, success state
- Desktop table มี mobile card fallback
- UI text ใช้ translation key
- Error toast ไม่ auto-dismiss
- Destructive action มี confirmation modal
- ไม่มี `dark:` utility
- `npm run check:api`, `npm run lint`, และ `npm run build` ต้องผ่านก่อน release

---

## 14. Conclusion

ระบบนี้เหมาะนำไปต่อยอดเป็นมาตรฐานภายในได้ เพราะมี foundation ที่ถูกทิศทางอยู่แล้ว: layered backend, validation, transaction, shared UI components, i18n, role guard, และ SharePoint integration

สิ่งที่ต้องแก้ก่อนประกาศเป็นมาตรฐานคือทำให้ pattern เหล่านี้สม่ำเสมอทั่วระบบ โดยเฉพาะ API response, upload/preview security, data fetching hook, และ CI guardrail ถ้าปิด gap กลุ่มนี้ได้ ระบบจะกลายเป็น template ที่แข็งแรงสำหรับ enterprise module อื่น ๆ ต่อไป
