# Tech Stack — รายละเอียดเทคโนโลยีที่ใช้ในระบบ

**โครงการ:** QMS System (Quality Management System)
**อัปเดตล่าสุด:** มิถุนายน 2026

---

## 1. Frontend Framework & Language

| เทคโนโลยี | เวอร์ชัน | รายละเอียด |
|---|---|---|
| **Next.js** | ^15.3.2 | React framework แบบ Full-stack ใช้ App Router สำหรับ Routing และ API Route Handlers |
| **React** | ^19.2.4 | UI Library สำหรับสร้าง Component-based Frontend |
| **TypeScript** | ^5.0 | ภาษา principal ของระบบ เปิด strict mode |

**เทคนิคที่ใช้:**
- App Router (`app/`) — Server Components เป็น default, Client Components เฉพาะเมื่อต้องการ interactivity (`"use client"`)
- Route Groups เช่น `(dashboard)/(user)/` — จัดกลุ่ม routes โดยไม่กระทบ URL path
- Parallel & Intercepting Routes — สำหรับ Modal patterns
- `generateMetadata()` — Dynamic SEO metadata
- Standalone output (`output: "standalone"`) — สำหรับ Docker deployment

---

## 2. Styling & Design System

| เทคโนโลยี | เวอร์ชัน | รายละเอียด |
|---|---|---|
| **Tailwind CSS** | ^4.3.0 | Utility-first CSS framework (CSS-first config แบบ v4) |
| **@tailwindcss/postcss** | ^4.3.0 | PostCSS plugin สำหรับ Tailwind v4 |
| **Radix UI Primitives** | - | Accessible headless UI (Dialog, Dropdown, Select, Tabs, Slot) |
| **class-variance-authority (cva)** | ^0.7.1 | สร้าง variants สำหรับ component styles |
| **clsx + tailwind-merge** | - | Merge class names อย่างปลอดภัย |
| **Lucide React** | ^1.16.0 | Icon library |

**เทคนิคที่ใช้:**
- **Tailwind v4 CSS-first:** กำหนด custom theme tokens ผ่าน `@theme {}` block ใน `globals.css` (primary `#0F1059`, secondary `#1D6A8A`, semantic colors)
- **Light Mode Only:** ไม่มี `dark:` utilities ตามข้อกำหนดของระบบ
- **Custom animations:** float, marquee, ticker, fade-up, fade-in, orb, pulse-glow, spin-slow, beam
- **Radix UI:** Dialog -> Modal, Sheet -> Drawer/Side panel, Tabs -> Tab navigation
- **Utility components** ใน `components/ui/` — `badge.tsx`, `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `select.tsx`, `sheet.tsx`, `skeleton.tsx`, `table.tsx`, `textarea.tsx`, `pagination.tsx`

---

## 3. Backend & Database

| เทคโนโลยี | เวอร์ชัน | รายละเอียด |
|---|---|---|
| **Next.js API Routes** | - | API Route Handlers ใน `app/api/` (App Router) |
| **Prisma ORM** | ^7.8.0 | Database ORM — Schema definition, Migrations, Query |
| **PostgreSQL** | - | ฐานข้อมูลหลัก (via Neon serverless or pg adapter) |
| **Zod** | ^4.4.3 | Runtime validation schemas |

**เทคนิคที่ใช้:**
- **3-Tier Backend Architecture:**
  - Route Handlers (`app/api/`) — thin controllers (<30 lines, no DB queries)
  - Services (`services/`) — business logic + permission checks
  - Repositories (`repositories/`) — data access layer (extends `BaseRepository`)
- **BaseRepository** (`repositories/baseRepository.ts`): Generic CRUD + pagination, รองรับ `Prisma.TransactionClient` (`tx`) สำหรับ transactions
- **Prisma Transactions:** ส่ง `tx` context ผ่าน repository chain ใน `$transaction`
- **Zod Validation:** `schemas/` — coerce number, enum validation, nested arrays
- **Prisma Adapter:** `@prisma/adapter-neon` + `@prisma/adapter-pg`
- **Prisma Client Output:** `generated/prisma/` (Prisma client output ของโปรเจกต์)

---

## 4. Authentication & Authorization

| เทคโนโลยี | รายละเอียด |
|---|---|
| **NextAuth.js v5** (beta.25) | Authentication framework |
| **Microsoft Entra ID** (Azure AD) | OAuth 2.0 / OpenID Connect Provider |
| **Microsoft Graph API** | User sync, email sending, SharePoint files |

**เทคนิคที่ใช้:**
- JWT session strategy
- `middleware.ts` — centralized auth guard + rate limiting + JWT blocklist
- Role-based access — path-level guard ใน middleware, โดยมีข้อยกเว้นเฉพาะบาง route ใต้ `/qms/*` และ public routes
- Session augmentation — injects role, msUserId, departmentId, employeeId, jti into session
- `requireAuth()` — server-side auth enforcement in API Routes
- Rate limiting via Redis (AUTH: 10 req/60s, API: 60 req/60s)
- JWT blocklist — force logout via Redis

---

## 5. Data Fetching & State Management

| เทคโนโลยี | เวอร์ชัน | รายละเอียด |
|---|---|---|
| **TanStack React Query** | ^5.100.14 | Server state management, caching, refetch |
| **React Hook Form** | ^7.76.1 | Form state management |
| **@hookform/resolvers** | ^5.4.0 | Zod resolver สำหรับ React Hook Form |

**เทคนิคที่ใช้:**
- `useAppQuery()` wrapper hook — standardize query behavior
- Custom hooks ใน `hooks/` — `use-dar.ts`, `use-kpi*.ts`, `use-departments.ts`, `use-announcements.ts`
- `revalidateTag()` — Server-side cache invalidation after mutations
- React Hook Form + Zod — controlled forms with inline validation errors

---

## 6. Infrastructure & Caching

| เทคโนโลยี | รายละเอียด |
|---|---|
| **Redis** (ioredis ^5.11.0) | Caching, rate limiting, JWT blocklist |
| **Docker** | Multi-stage build (Node 22 Alpine) |
| **docker-compose.yml** | Redis 7 + QMS app |
| **Grafana + Loki** | Logging & monitoring stack |

**เทคนิคที่ใช้:**
- Multi-stage Dockerfile — builder stage + production runner stage
- Standalone Next.js output — minimal production image
- Redis singleton (`lib/redis.ts`) — ioredis client
- Custom instrumentation (`instrumentation.ts`) — runtime hooks

---

## 7. Microsoft Integration

| เทคโนโลยี | รายละเอียด |
|---|---|
| **Microsoft Graph API** | Entra ID users, groups, email (Mail.Send), SharePoint |
| **SharePoint** | File storage — upload, download, preview, delete, folder management |
| **MS365 Groups** | Group sync for department management |

**เทคนิคที่ใช้:**
- SharePoint file browser — list files in document library via Graph API
- Temp file upload → move to final SharePoint folder on DAR submit
- Office Online embed (`spItemId`) — preview Word/Excel/PowerPoint
- Graph token management (`lib/graph-token.ts`) — OBO or client credentials flow
- `lib/sharepoint.ts` — SharePoint API helpers
- `services/sharepoint.ts` — upload/move/delete operations

---

## 8. Internationalization (i18n)

| เทคโนโลยี | รายละเอียด |
|---|---|
| **Custom i18n system** | JSON translation files + React context |
| **messages/en.json** | ~848 lines (~390 keys, snapshot ปัจจุบัน) |
| **messages/th.json** | ~847 lines (~390 keys, snapshot ปัจจุบัน) |

**เทคนิคที่ใช้:**
- React hook `useT()` — returns translated string by key
- Server function `t(key, locale)` — for server-side translation
- Locale context (`lib/locale-context.tsx`) — persists locale preference
- UI text ส่วนใหญ่ผ่าน `t()` / `useT()` แต่ยังมี hardcoded strings บางจุดใน utility/placeholder text

---

## 9. Module Domains

| โมดูล | คำอธิบาย |
|---|---|
| **DAR** (Document Approval Request) | Full workflow: Draft → Submit → Multi-level Approval → QMS Processing → Complete |
| **KPI** (Key Performance Indicators) | Annual KPI setup → Objectives → Monthly tracking → Corrective Actions |
| **Document Control** | Document registry, categories, revisions, file management |
| **Announcements** | Rich announcements (LIST/SCROLLING/BANNER), background customization |
| **Approval Queue** | Unified approval interface for DAR + KPI with role-based filtering |
| **IT Management** | User/Department CRUD, MS365 sync, Azure AD integration |

---

## 10. Other Tools & Libraries

| เครื่องมือ | รายละเอียด |
|---|---|
| **ESLint** (^9 + flat config) | Custom rule `ndc/no-db-in-api` — ห้าม import Prisma ใน API routes |
| **Sonner** (^2.0.7) | Toast notifications — success auto-dismiss 3s, error manual dismiss |
| **tsx** (^4.21.0) | TypeScript execution environment |
| **PostCSS** | CSS processing pipeline |
