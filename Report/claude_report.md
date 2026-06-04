# Claude System Report — QMS System
**วันที่ประเมิน:** 30 พฤษภาคม 2026  
**ประเมินโดย:** Claude Sonnet 4.6 (1M context)  
**ขอบเขต:** Full-stack analysis — API, Services, Repositories, Schemas, Components, Database, Security, i18n

---

## สรุปผลประเมิน (Executive Summary)

ระบบ QMS เป็น **enterprise-grade Next.js application** ที่มีสถาปัตยกรรมดีและพร้อมใช้งาน Production โดยรวมมีจุดแข็งชัดเจนในเรื่อง separation of concerns, type safety, และ security รวมถึง integration ครบกับ Microsoft 365 และ SharePoint อย่างไรก็ตามมีส่วนที่ควรเพิ่มและแก้ไขเพื่อความยั่งยืนในระยะยาว

| ด้าน | สถานะ | คะแนน |
|------|--------|--------|
| สถาปัตยกรรม (Architecture) | ✅ ดีมาก | 9/10 |
| API Routes | ✅ ครบ | 9/10 |
| Database Schema | ✅ ดี | 8/10 |
| Security | ✅ แข็งแกร่ง | 8/10 |
| i18n (ภาษา) | ✅ เกือบสมบูรณ์ | 9/10 |
| Input Validation | ⚠️ บางส่วน | 7/10 |
| Testing | ❌ ขาดหาย | 1/10 |
| Documentation | ⚠️ บางส่วน | 6/10 |
| Error Monitoring | ❌ ขาดหาย | 2/10 |

---

## 1. สิ่งที่ดีอยู่แล้ว ✅

### 1.1 สถาปัตยกรรมแบบ Layered ชัดเจน
โปรเจกต์แบ่ง layer ตาม CLAUDE.md ได้สมบูรณ์ทุก route:

```
Route Handler (얇) → Service (business logic) → Repository (DB) → Prisma
```

- **ไม่มี** `import @prisma/client` ใน `/app/api/` โดยตรง — ทำถูกต้อง 100%
- Repository ทุกตัว extend `BaseRepository` และรับ `tx` param สำหรับ transactions
- Service ทุกตัว throw custom errors (`NotFoundError`, `ConflictError`) แทนการ return null

### 1.2 API Coverage ครบถ้วน (56 endpoints)
ครอบคลุมทุก workflow หลัก:
- **DAR Workflow:** create → submit → review → approve/reject → distribute
- **KPI System:** objectives → monthly reports → details → corrective actions
- **Document Control:** CRUD + versioning + file upload/download
- **IT Admin:** user sync (M365) + role management + department management
- **SharePoint:** 7 endpoints สำหรับ file management
- **Support:** announcements, approval config, health check, profile

### 1.3 ความปลอดภัย (Security)

**Rate Limiting (Redis-backed):**
- Auth endpoints: 10 req/min
- API endpoints: 60 req/min

**Session Management:**
- JWT blocklist ด้วย Redis (force logout)
- Role-based route protection ใน middleware.ts
- `requireAuth()` / `requireRole()` ใน service layer

**HTTP Security Headers (`next.config.js`):**
- `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- `Referrer-Policy`, `Permissions-Policy`

### 1.4 Type Safety ครบ
- `strict: true` ใน tsconfig.json
- Zod validation ทุก API input
- Prisma generated types ใช้ทั่วทั้งระบบ
- ไม่พบ `any` types ใน critical code paths

### 1.5 Frontend Patterns ถูกต้อง
- ใช้ **TanStack Query** สำหรับ data fetching ทุก client component
- ไม่พบ raw `useEffect + fetch` ใน components
- **Radix UI** สำหรับ Dialog, Dropdown, Select, Tabs (A11y compliance)
- **React Hook Form + Zod** สำหรับทุก form

### 1.6 i18n Coverage 99.8%
- `messages/en.json`: 648 keys
- `messages/th.json`: 647 keys
- ครอบคลุม DAR, KPI, Document Control, Auth, Error messages, Validation messages

### 1.7 Microsoft 365 Integration
- **Microsoft Entra ID** authentication (NextAuth v5)
- **Microsoft Graph API**: user search, department sync, email send (Mail.Send scope)
- **SharePoint REST API**: file upload/download/browse
- HTML email templates รองรับ **ทั้งไทยและอังกฤษ**

---

## 2. สิ่งที่ควรแก้ไข (Issues to Fix)

### 2.1 🔴 ปานกลาง — NextAuth v5 เป็น Beta

```json
// package.json
"next-auth": "5.0.0-beta.25"
```

**ปัญหา:** Production system ใช้ beta library ที่อาจมี breaking changes  
**ความเสี่ยง:** การ update minor version อาจทำให้ auth ล้มเหลว  
**วิธีแก้:** วางแผน migrate ไป v5 stable เมื่อ release หรือ lock version ด้วย `"next-auth": "5.0.0-beta.25"` (ปัจจุบันทำอยู่แล้ว) และ freeze ไม่ update

---

### 2.2 🔴 ปานกลาง — Missing Input Validation ใน SharePoint Routes

บาง route ขาด Zod schema สำหรับ validate input:

```typescript
// app/api/sharepoint/upload-file/route.ts
// ไม่มี validation สำหรับ: file size limit, file type whitelist, path traversal prevention
```

**ความเสี่ยง:** อาจรับ file ประเภทที่ไม่ต้องการหรือ path ที่อันตรายได้  
**วิธีแก้:** เพิ่ม schema ใน `schemas/sharepointSchema.ts`:

```typescript
export const uploadFileSchema = z.object({
  folderId: z.string().min(1),
  fileName: z.string().regex(/^[a-zA-Z0-9฀-๿\s\-_.]+$/, 'Invalid filename'),
  contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png', '...']),
})
```

---

### 2.3 🔴 ปานกลาง — Department Filter ใน KPI Monthly Route ไม่ทำงาน

```typescript
// app/api/kpi/[id]/monthly/route.ts
// ปัจจุบัน
const result = await kpiMonthlyService.list(kpiId, { department: undefined })  // ❌

// ควรเป็น
const { department } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
const result = await kpiMonthlyService.list(kpiId, { department })  // ✅
```

**ผลกระทบ:** Filter by department ใน monthly reports จะไม่ทำงาน

---

### 2.4 🟡 เล็กน้อย — Missing Thai Translation (1 key)

จำนวน keys ไม่ตรงกัน (en: 648, th: 647) และ:

```json
// messages/en.json
"nav": { "sharepoint": "SharePoint Files" }

// messages/th.json
"nav": { "sharepoint": "SharePoint Files" }  // ❌ ไม่ได้แปล
```

**วิธีแก้:** เปลี่ยนเป็น `"sharepoint": "ไฟล์ SharePoint"` และค้นหา key ที่หายไป 1 อัน

---

### 2.5 🟡 เล็กน้อย — Missing Content Security Policy Header

```javascript
// next.config.js — ยังขาด CSP header
// ควรเพิ่ม:
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-inline'; ..."
}
```

---

### 2.6 🟡 เล็กน้อย — Database Indexes หายไปบางจุด

```prisma
// ขาด index ใน models เหล่านี้:
model Announcement {
  createdById  String  // ❌ ไม่มี @@index
}

model PublicDocument {
  darMasterId  String  // ❌ ไม่มี @@index
}
```

**วิธีแก้:** เพิ่ม `@@index([createdById])` และ `@@index([darMasterId])` ใน schema

---

### 2.7 🟡 เล็กน้อย — QMS Route Protection ไม่ชัดเจน

```typescript
// middleware.ts
if (path.startsWith("/qms/") &&
    !path.startsWith("/qms/document-controls") &&
    !path.startsWith("/qms/kpi") &&  // ← ทุก role เข้าได้
    role !== "QMS" && role !== "MR" && role !== "IT")
```

**ปัญหา:** User ทุกคนเข้า `/qms/document-controls` และ `/qms/kpi` ได้โดยตรง  
**ต้องชี้แจง:** หากตั้งใจให้ read-only สำหรับทุกคน ควร enforce ใน component/service ด้วย

---

### 2.8 🟡 เล็กน้อย — Inconsistent Error Context Logging

```typescript
// หลาย routes ไม่ pass context ให้ handleApiError
handleApiError(error)  // ❌ ไม่มี context

// ควรเป็น
handleApiError(error, { route: '/api/kpi/[id]', method: 'GET', userId: session.user.id })  // ✅
```

---

## 3. สิ่งที่ควรเพิ่ม (Missing Features)

### 3.1 ❌ สำคัญมาก — Testing Framework ไม่มีเลย

ระบบไม่มี test files และไม่ได้ติดตั้ง test framework  
**ความเสี่ยง:** ไม่สามารถตรวจ regression ได้เมื่อเพิ่มฟีเจอร์ใหม่

**แนะนำให้เพิ่ม:**
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom
```

**Priority test cases:**
1. `darService.ts` — approval workflow transitions (state machine logic)
2. `kpiMonthlyService.ts` — monthly report submission & approval
3. `documentControlService.ts` — versioning logic
4. API route handlers — input validation & error responses

---

### 3.2 ❌ สำคัญ — Error Monitoring Service

ปัจจุบัน errors ถูก log ด้วย `console.error()` เท่านั้น ไม่มี alerting

**แนะนำ:** เพิ่ม Sentry หรือ equivalent:

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context })
  logger.error(error.message, context)
}
```

**Integration points:**
- `lib/apiErrorHandler.ts` — สำหรับ unexpected errors
- `services/email.ts` — สำหรับ failed email deliveries
- `lib/sharepoint.ts` — สำหรับ SharePoint API failures

---

### 3.3 ❌ สำคัญ — Response Caching Strategy

ยังไม่มี caching สำหรับ data ที่ไม่ค่อยเปลี่ยนแปลง เช่น departments, categories

**แนะนำ:** ใช้ Next.js `unstable_cache` หรือ `revalidateTag`:

```typescript
// repositories/departmentRepository.ts
import { unstable_cache } from 'next/cache'

export const getCachedDepartments = unstable_cache(
  async () => departmentRepository.findAll(),
  ['departments'],
  { revalidate: 3600, tags: ['departments'] }
)
```

---

### 3.4 ⚠️ แนะนำ — API Documentation (OpenAPI/Swagger)

ยังไม่มี API documentation สำหรับ developer onboarding

**แนะนำ:** ใช้ `next-swagger-doc` หรือสร้าง `docs/api/` directory ด้วย OpenAPI spec

---

### 3.5 ⚠️ แนะนำ — Audit Trail Logging

ปัจจุบันไม่มี structured log สำหรับ business-critical actions (อาจต้องการสำหรับ compliance)

**แนะนำ:** เพิ่ม model `AuditLog` ใน Prisma schema:

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String   // 'APPROVE_DAR', 'REJECT_KPI', etc.
  entityType String   // 'DAR', 'KPI', 'DOCUMENT'
  entityId   String
  before     Json?
  after      Json?
  createdAt  DateTime @default(now())
  @@index([userId, createdAt])
  @@index([entityType, entityId])
}
```

---

### 3.6 ⚠️ แนะนำ — Database ER Diagram

ยังไม่มี visual documentation ของ database relationships  
**แนะนำ:** สร้าง ER diagram ใน `Report/` folder โดยใช้ Prisma ERD generator:

```bash
npx prisma-erd-generator
```

---

### 3.7 ⚠️ แนะนำ — Soft Delete Strategy

ปัจจุบัน records ถูกลบจริง (hard delete) บาง workflow (เช่น DAR ที่ approved แล้ว) ควรเก็บไว้เพื่อ compliance

**แนะนำ:** เพิ่ม `deletedAt DateTime?` ใน critical models:

```prisma
model DarMaster {
  // ...
  deletedAt DateTime?  // null = active, set = soft deleted
  @@index([deletedAt])
}
```

---

## 4. โครงสร้างไฟล์ที่วิเคราะห์

```
qms-system/
├── app/api/                # 56 endpoints ✅
├── app/(dashboard)/        # 32 pages ✅
├── services/               # 12 services ✅
├── repositories/           # 15 repositories ✅
├── schemas/                # 5 schema files ⚠️ (SharePoint ขาด)
├── components/             # 129 components ✅
├── lib/                    # 24 utilities ✅
├── errors/                 # Custom error classes ✅
├── hooks/                  # 7 custom hooks ✅
├── types/                  # 6 type definitions ✅
├── messages/               # en.json (648 keys), th.json (647 keys) ⚠️
├── prisma/schema.prisma    # 19 models ✅
└── middleware.ts           # Rate limiting + RBAC ✅
```

---

## 5. Action Plan สรุป

### Phase 1 — ด่วน (Sprint ถัดไป)
| # | งาน | ไฟล์ที่แก้ |
|---|-----|------------|
| 1 | แก้ department filter ใน KPI monthly route | `app/api/kpi/[id]/monthly/route.ts` |
| 2 | เพิ่ม Zod schema สำหรับ SharePoint upload route | `schemas/sharepointSchema.ts` |
| 3 | แก้ Thai translation หาย + "SharePoint Files" | `messages/th.json` |
| 4 | เพิ่ม database indexes ที่หายไป 2 จุด | `prisma/schema.prisma` |

### Phase 2 — สำคัญ (2 Sprints)
| # | งาน | ไฟล์ที่แก้ |
|---|-----|------------|
| 5 | เพิ่ม Content-Security-Policy header | `next.config.js` |
| 6 | เพิ่ม error context ใน API handlers | `app/api/**/*.ts` |
| 7 | ชี้แจง + แก้ QMS route access control | `middleware.ts` |
| 8 | ติดตั้ง error monitoring (Sentry) | `lib/monitoring.ts` |

### Phase 3 — ระยะกลาง (1 เดือน)
| # | งาน |
|---|-----|
| 9 | ติดตั้ง Vitest + เขียน unit tests สำหรับ services |
| 10 | สร้าง API documentation |
| 11 | เพิ่ม response caching สำหรับ static data |
| 12 | สร้าง ER diagram |

### Phase 4 — อนาคต
| # | งาน |
|---|-----|
| 13 | เพิ่ม Audit Trail (AuditLog model) |
| 14 | Implement soft delete สำหรับ compliance |
| 15 | พิจารณา migrate NextAuth v5 beta → stable |
| 16 | แยก `DarService` (730 lines) เป็น sub-services |

---

## 6. สรุปสุดท้าย

**ระบบ QMS พร้อม Production** และมีคุณภาพโดยรวมสูง จุดแข็งหลักคือการแยก concern ชัดเจน, type safety, security ครบ, และ M365 integration ที่สมบูรณ์ 

จุดที่ต้องการความสนใจมากที่สุดคือ **การขาด testing framework** และ **error monitoring** ซึ่งเป็นเรื่องที่มักถูกมองข้ามในช่วงพัฒนาเบื้องต้น แต่มีผลสำคัญต่อความมั่นใจเมื่อระบบเติบโตขึ้น

> โปรเจกต์นี้แสดงให้เห็นถึงการออกแบบที่ดีและทีมพัฒนาที่มีความเข้าใจ enterprise patterns เป็นอย่างดี
