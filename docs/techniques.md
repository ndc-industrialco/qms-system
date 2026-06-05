# Techniques — เทคนิคและรูปแบบการพัฒนาระบบ

**โครงการ:** QMS System (Quality Management System)
**อัปเดตล่าสุด:** มิถุนายน 2026

---

## 1. รูปแบบสถาปัตยกรรม (Architectural Patterns)

### 1.1 3-Tier Backend Architecture

ระบบแบ่งชั้น backend ออกเป็น 3 ชั้นตามหน้าที่อย่างชัดเจน:

```
Route Handler (app/api/...)  →  Service (services/)  →  Repository (repositories/)
     ↓                            ↓                          ↓
  Parse request              Business logic             Data access
  Validate input (Zod)       Permission checks          Prisma queries
  Call service               Transaction coord.         Extends BaseRepository
  Send response              Error handling             Accepts tx context
```

**หลักการสำคัญ:**
- Route Handler ห้ามเรียก Prisma โดยตรง — ตรวจสอบโดย custom ESLint rule `ndc/no-db-in-api`
- Service ควรใช้ repository เป็นหลัก — ถ้าต้องทำ transaction orchestration สามารถใช้ `db.$transaction()` เป็น boundary ได้
- Repository ทุกตัวรับ optional `tx?: Prisma.TransactionClient` เพื่อรองรับ transactions

### 1.2 Repository Pattern with BaseRepository

ไฟล์: `repositories/baseRepository.ts`

```typescript
abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  // Generic CRUD: findById, create, update, delete
  // Generic paginate(page, limit, where, orderBy)
  // getModel(tx?) → returns Prisma delegate (supports tx)
}
```

Repository แต่ละตัว extends `BaseRepository` และสามารถเพิ่ม method เฉพาะ:

```typescript
class DarRepository extends BaseRepository<DarMaster> {
  async findDetailById(id, tx?) { /* include relations */ }
  async findManyByRequester(requesterId, skip, take, tx?) { /* filtered */ }
}
```

### 1.3 Prisma Transaction Strategy

เมื่อต้องการ atomic operations จะใช้ `db.$transaction(async (tx) => { ... })` และส่ง `tx` ไปยัง repository:

```typescript
await db.$transaction(async (tx) => {
  await this.darRepo.update(id, { status: "COMPLETED" }, tx);
  await this.approvalSignatureRepo.create(signatureData, tx);
  await this.qmsProcessingRepo.create(processingData, tx);
});
```

### 1.4 Route Handler Pattern (Thin Controller)

Route Handler ทุกตัวมีโครงสร้างมาตรฐาน:

```typescript
export async function GET/POST/PUT/DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();           // Auth check
    const parsed = someSchema.parse(body);          // Zod validation
    const result = await someService.method(data);   // Business logic
    return sendSuccess(result, "message", status);   // Standard response
  } catch (err) {
    return handleApiError(err);                      // Error handling
  }
}
```

---

## 2. Error Handling Patterns

### 2.1 Custom Error Classes

ไฟล์: `errors/customErrors.ts`

| Class | HTTP Status | code |
|---|---|---|
| `AppError` | 500 (base) | INTERNAL_SERVER_ERROR |
| `ValidationError` | 400 | VALIDATION_ERROR |
| `UnauthorizedError` | 401 | UNAUTHORIZED |
| `ForbiddenError` | 403 | FORBIDDEN |
| `NotFoundError` | 404 | NOT_FOUND |
| `ConflictError` | 409 | CONFLICT |

### 2.2 Standardized Error Response

ฟังก์ชัน `handleApiError()` จัดการ error ทุกประเภท:
- `AppError` → ส่ง status code + message + errorCode
- `ZodError` → 400 พร้อม field-level validation details
- Unknown error → 500 (generic message, ไม่ leak internal details)
- Logging: error-level สำหรับ 5xx, warn-level สำหรับ validation errors

### 2.3 Standardized Success Response

ฟังก์ชัน `sendSuccess(data?, message?, status?, meta?)`:
```typescript
sendSuccess(dars, "DARs retrieved", 200, { page, limit, total });
// → { success: true, message: "...", data: [...], meta: { page, limit, total } }
```

---

## 3. Authentication & Middleware Patterns

### 3.1 NextAuth.js v5 + Microsoft Entra ID

- JWT session strategy — no database session store
- Session augmentation ใน `auth.config.ts` callbacks:
  - Token → Session mapping: role, msUserId, departmentId, employeeId, jti
- `requireAuth()` — เรียกใน API Route handlers เพื่อ validate session

### 3.2 Middleware Pattern (centralized)

ไฟล์: `middleware.ts`

ทำงานแบบ waterfall:
1. API paths → Rate limiting (Redis) → Request logging
2. Public paths → Check if already logged in (redirect from /auth/login)
3. Unauthenticated → Redirect to /auth/login
4. JWT blocklist check → Redirect if session revoked
5. Role-based access → `/it/*` (IT only), `/qms/*` (QMS/MR/IT) พร้อมข้อยกเว้นเฉพาะบาง route
6. Request logging with X-Request-Id

### 3.3 JWT Blocklist (Force Logout)

เมื่อต้องการบังคับ logout (เปลี่ยนรหัส, ถูกลบจากระบบ):
- ระบบเก็บ `jti` (JWT ID) ของ session ที่ถูก revoke ไว้ใน Redis
- Middleware ตรวจสอบทุก request ว่ามี `jti` อยู่ใน blocklist หรือไม่
- ถ้าพบ → redirect ไป /auth/login พร้อม reason: session_revoked

---

## 4. Frontend Patterns

### 4.1 Server/Client Component Split

- **Server Components**: pages, layouts, data-fetching wrapper components
- **Client Components** (`"use client"`): components ที่ต้องการ interactivity (forms, dialogs, tables, tanstack query hooks)
- **Data Fetching**: TanStack Query (`useAppQuery`) สำหรับ client-side data fetching
- **Cache Invalidation**: `revalidateTag()` after mutations

### 4.2 Form Pattern (React Hook Form + Zod)

```typescript
const form = useForm<FormType>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});
// <form onSubmit={form.handleSubmit(onSubmit)}>
// <Input {...form.register("field")} />
// {errors.field && <p className="text-rose-500">{errors.field.message}</p>}
```

### 4.3 Dialog/Drawer Pattern (Radix UI)

- **Modal**: for destructive actions (delete confirm) หรือ forms ≤2 fields
- **Right-side Drawer** (Sheet): for forms ≥5 fields
- **Mobile**: Bottom Sheet pattern (responsive adaptation)
- Complex dialog/drawer ใช้ Radix UI Primitive เพื่อ accessibility

### 4.4 Responsive Data Display

- Viewport ≥ `lg` → Data Table (`<th>`, aligned columns)
- Viewport < `lg` → Card List fallback (`p-4` layout)
- KPI Cards: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6`

### 4.5 QueryProvider Pattern

ไฟล์: `components/common/QueryProvider.tsx`
- Wraps app with TanStack QueryClientProvider
- กำหนด default options (staleTime, retry, refetchOnWindowFocus)

---

## 5. i18n (Internationalization) Pattern

### 5.1 Translation System

- JSON files: `messages/en.json`, `messages/th.json`
- React hook: `const t = useT()` → `t('dar.field.docNum')`
- Server function: `import { t } from "@/lib/i18n"` → `t('common.save', locale)`
- Locale context: `lib/locale-context.tsx` — persists via React context
- **No hardcoded strings:** UI text ส่วนใหญ่ต้องผ่าน translation function แต่ยอมรับ legacy/utility exceptions บางจุด

### 5.2 Legacy Key Mapping

มี `legacyKeyMap` สำหรับ backward compatibility:
```typescript
legacyKeyMap = { confirm: "common.confirm", save: "common.save", ... }
```
สามารถใช้ทั้ง `t("confirm")` และ `t("common.confirm")`

---

## 6. Design System Tokens

### 6.1 Color System

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#0F1059` | Primary actions, titles, sidebar |
| `--color-secondary` | `#1D6A8A` | Secondary elements |
| `--color-accent` | `#3B82F6` | Accent/Info |
| `--color-base-200` | `#F5F6FA` | Body background |
| `--color-base-100` | `#FFFFFF` | Card/Surface |
| `--color-success` | `#10B981` | Success states |
| `--color-warning` | `#F59E0B` | Pending states |
| `--color-error` | `#EF4444` | Error/Danger states |

### 6.2 Typography

| Element | Class |
|---|---|
| Page Title | `text-2xl font-bold tracking-tight` |
| Body | `text-base text-slate-600` |
| Table/Form | `text-sm text-slate-600` |
| Subtext | `text-xs text-slate-400` |

### 6.3 Shape & Spacing

| Element | Style |
|---|---|
| Cards | `rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white` |
| Inputs/Buttons | `rounded-xl` |
| Radii (global) | `--radius-selector: 0.375rem; --radius-field: 0.5rem; --radius-box: 0.75rem;` |

### 6.4 State Mapping (Accessibility)

| State | Style | Indicator |
|---|---|---|
| Success/Approved | `bg-emerald-50 text-emerald-600 border-emerald-200` | ✓ |
| Pending/Warning | `bg-amber-50 text-amber-600 border-amber-200` | Pending |
| Danger/Rejected | `bg-rose-50 text-rose-600 border-rose-200` | ✕ / ! |

---

## 7. Toast Notification Pattern (Sonner)

| Type | Behavior |
|---|---|
| Success | `toast.success("message")` — auto-dismiss 3s |
| Error | `toast.error("message", { duration: Infinity })` — ต้อง manual dismiss |
| Constraint | ห้ามใช้ toast สำหรับ destructive confirmation (ใช้ modal) หรือ inline validation |

---

## 8. Permission & Role Pattern

### 8.1 Role Hierarchy

| Role | สิทธิ์ |
|---|---|
| **USER** | สร้าง DAR ของตัวเอง, ดู KPI, ดู Document Controls |
| **MR** (Management Rep) | ดู/จัดการ DAR, KPI, Document Controls ทั้งระบบ |
| **QMS** | เหมือน MR + จัดการ QMS Config, Announcements |
| **IT** | จัดการ Users, Departments, MS365 Sync, System Config |

### 8.2 Permission Enforcement

- **Middleware layer**: Role-based path restriction (`/it/*`, `/qms/*`)
- **API layer**: `requireAuth()` + `isPrivilegedRole()`
- **UI layer** (planned): component-level permission checks สำหรับกรณีที่ต้องซ่อน action ตาม role

### 8.3 Privileged Role Check (Centralized)

```typescript
// lib/permissions.ts
export const PRIVILEGED_ROLES: UserRole[] = ["IT", "QMS", "MR"];
export function isPrivilegedRole(role) {
  return PRIVILEGED_ROLES.includes(role as UserRole);
}
```

---

## 9. Microsoft Graph & SharePoint Integration

### 9.1 Graph API Patterns

- Access token acquisition via `lib/graph-token.ts` (OAuth 2.0 client credentials)
- Graph API calls via `lib/graphFetch.ts` — centralized fetch wrapper
- User sync: `GET /users` → upsert users from Entra ID
- Email sending: `POST /users/{id}/sendMail`

### 9.2 SharePoint File Management

- **Temp Upload**: Upload files to temp SharePoint folder before DAR submission
- **Move on Submit**: เมื่อ DAR ถูก submit → ย้ายไฟล์จาก temp folder ไปยัง DAR-specific folder
- **File Operations**: List files, upload, download, delete, create folder
- **Office Online Preview**: Embed Office documents via SharePoint `spItemId`
- **Preview Proxy**: `app/api/sharepoint/preview-proxy/` — Secure file preview without exposing SharePoint token to client

---

## 10. KPI Workflow State Machine

KPI และ KPI Monthly Report ใช้ state machine pattern:

```
KPI: DRAFT → PENDING_REVIEW → APPROVED / REJECTED
KPI Monthly: DRAFT → PENDING_REVIEW → PENDING_APPROVAL → APPROVED / REJECTED
```

ไฟล์ `lib/kpi-state-machine.ts` — centralized state transition logic:
- กำหนด valid transitions
- ตรวจสอบ permission ก่อน transition
- บันทึก approval signatures

---

## 11. Monitoring & Observability

- **Grafana** + **Loki**: log aggregation
- **Request logging**: middleware บันทึก http_request ทุกครั้ง (method, path, status, ip, requestId, userId)
- **Structured logging**: JSON format → `logger.info/warn/error` → พร้อม context metadata
- **X-Request-Id**: ติดตาม request ตลอด lifecycle (middleware → API route → response header)

---

## 12. Security Practices

| หัวข้อ | รายละเอียด |
|---|---|
| Rate Limiting | Redis-based, 10 req/60s for auth, 60 req/60s for API |
| JWT Blocklist | Force logout by revoking specific session (jti) |
| Security Headers | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy (set in next.config.js) |
| No Sensitive Leaks | Internal error details not returned to client (handleApiError) |
| Input Validation | Zod schema validation on every API endpoint |
| Auth Enforcement | Middleware + requireAuth() for all protected routes |
| Role-based Access | Path-level in middleware, function-level in API/UI (มี path exceptions บางจุด) |

---

## 13. Docker & Deployment

### 13.1 Multi-stage Build

- **Stage 1 (builder)**: npm ci → next build
- **Stage 2 (runner)**: Node 22 Alpine + standalone output
- **Output**: `standalone` mode (Next.js) + `public/` + `generated/prisma/`

### 13.2 docker-compose.yml

```yaml
services:
  redis: image: redis:7-alpine
  qms: image: ghcr.io/...  # depends on redis
```

### 13.3 Environment Variables

| Variable | รายละเอียด |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AZURE_AD_CLIENT_ID` | Entra ID app registration |
| `AZURE_AD_CLIENT_SECRET` | Client secret |
| `AZURE_AD_TENANT_ID` | Tenant ID |
| `SHAREPOINT_SITE_ID` | SharePoint site ID |
| `AUTH_SECRET` | NextAuth.js encryption secret |
| `REDIS_URL` | Redis connection string |

---

## 14. Coding Standards & Quality

| ข้อกำหนด | รายละเอียด |
|---|---|
| Async/Await only | No `.then()` or `.catch()` |
| No Prisma in API routes | Enforced by custom ESLint rule |
| No hardcoded strings | UI text mostly via `t()` / `useT()`; legacy/utility exceptions ยังมีอยู่ |
| Strict TypeScript | strict mode enabled |
| Light mode only | No `dark:` utilities |
| i18n | All user-facing strings in translation files |
| Error handling | Custom error classes → `handleApiError` |
| Repository pattern | Every DB operation through repository |
| Transactions | Prisma `$transaction` + `tx` context propagation |
| Thin route handlers | < 30 lines per handler |

---

## 15. Development Workflow

| คำสั่ง | ความหมาย |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check (incl. custom rules) |
| `npx prisma migrate dev` | Create/apply migrations |
| `npx prisma studio` | Prisma GUI |
| `npm run check:api` | Validate API pattern compliance |
