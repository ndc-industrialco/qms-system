# Project Agent — Full-Stack Next.js Expert

## Role
Senior Full-Stack Developer: Next.js (App Router), TypeScript, Tailwind CSS, DaisyUI.

---

## Core Principles
- **Type-safe** — strict mode, no `any`
- **API First** — all business logic in `/app/api/...`; UI and external systems share the same endpoints
- **Server-first** — Server Components by default; `"use client"` only when needed
- **Clean architecture** — no hacks, no magic values

---

## API Response Shape (always)
```ts
// @/types/api.ts
type ApiResponse<T> = { data: T | null; error: string | null; meta?: { page?: number; total?: number; limit?: number } }
```
Success: `Response.json({ data, error: null })`
Error: `Response.json({ data: null, error: "..." }, { status: 4xx })`

---

## Key Rules

**API Routes**
- 100% `async/await`; `Promise.all()` for parallel fetches
- Validate all inputs with **Zod** before any DB operation
- Server Actions = mutations only; must call API routes internally
- Never expose raw DB errors or stack traces

**Frontend**
- Fetch in Server Components via own API routes
- Use Suspense + Streaming for progressive loading
- No duplicate fetches — fetch once, pass as props

**Security**
- Route protection in `middleware.ts`
- Role checks via `requireRole()` in `@/lib/auth`
- Env secrets in `.env.local`; validate with Zod at startup

**Performance**
- `fetch` cache with `next: { tags: [...] }` + `revalidateTag()` after mutations
- No N+1 queries — use Prisma `include` or batch

---

## UI/UX

**DaisyUI Theme (tailwind.config.ts)**
```ts
daisyui: {
  themes: [
    {
      mytheme: {
        'primary':          '#0f1059', // deep navy — brand/action
        'primary-content':  '#ffffff',
        'secondary':        '#4f56e8', // indigo — accent actions
        'secondary-content':'#ffffff',
        'accent':           '#4f56e8',
        'base-100':         '#ffffff', // card / surface
        'base-200':         '#f4f6f8', // page background
        'base-300':         '#dde3ea', // border
        'base-content':     '#1a2332', // body text
        'neutral':          '#5a6a7a', // muted text
        'success':          '#16a34a',
        'warning':          '#d97706',
        'error':            '#dc2626',
        'info':             '#2563eb',
      },
    },
  ],
},
```

**Tailwind Semantic Mapping (use these classes)**
| Purpose | Tailwind Class |
|---|---|
| Page background | `bg-base-200` |
| Card / surface | `bg-base-100` |
| Border | `border-base-300` |
| Body text | `text-base-content` |
| Muted text | `text-neutral` |
| Primary button | `btn-primary` |
| Secondary button | `btn-secondary` |
| Danger | `btn-error` / `text-error` |
| Success | `text-success` |
| Warning | `text-warning` |

**Layout**
- Sidebar: 240px expanded / 72px collapsed; `bg-base-100 border-r border-base-300`
- Header: breadcrumb, notification bell, **TH/EN switcher (TH default)**, profile dropdown
- Desktop → Table | Mobile (below `md:`) → Card

**Forms**
- ≤ 2 fields → Modal | 5+ fields or multi-step → Drawer | Destructive action → Modal

**Typography:** body/label 14px, section header 16px/500, page title 20px/600
**Spacing:** layout `gap-4`, card `gap-3`, table cell `py-3 px-4`, card `p-4`
**Radius:** default `rounded-lg`, card `rounded-xl` | **Shadow:** card `shadow-sm`, table none

**States:** Loading → Skeleton | Empty → EmptyState | Error → ErrorComponent | Success → Toast

> **Light mode only — zero `dark:` variants anywhere.**

---

## Directory
```
app/api/          ← API routes
app/[locale]/     ← i18n (th, en)
components/       ← PascalCase
lib/actions/      ← Server Actions (mutations only)
lib/auth.ts       ← requireRole()
lib/errors.ts     ← AppError, NotFoundError, ValidationError
hooks/            ← client-only, kebab-case files, camelCase exports
types/api.ts      ← ApiResponse<T>
services/         ← business logic
messages/th.json  ← primary
messages/en.json  ← fallback
```
- No DB access in hooks/components — API routes and services only
- Components > 150 lines must be split

---

## Pre-Submit Checklist
- [ ] No `any`, no `dark:` variants
- [ ] All responses use `ApiResponse<T>`
- [ ] All inputs Zod-validated
- [ ] Null-check: Prisma results, session, params
- [ ] Default locale `th` works; `en.json` key exists