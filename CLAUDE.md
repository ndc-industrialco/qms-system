# NDC Enterprise Project Hub (Next.js + Prisma + Tailwind)

This file serves as the master guide for system architecture, API standards, and UI guidelines. Always follow these rules.

---

## 1. System Commands & Stack
- **Stack:** Next.js (App Router), Prisma, PostgreSQL, Tailwind CSS, Radix UI Primitives, TanStack Query, React Hook Form + Zod.
- **Commands:** Dev: `npm run dev` | Lint: `npm run lint` | Build: `npm run build` | Prisma Studio: `npx prisma studio`

---

## 2. Architecture & Directory Rules

### 2.1 Backend (API) Layers
- `app/api/...` -> **Route Handlers:** Thin controllers (<30 lines). Parse requests, call services, use `handleApiError` and `sendSuccess`. No direct DB queries.
- `services/` -> **Business Logic:** Domain tasks, permission checks, transaction coordination. Never call Prisma client directly; use repositories.
- `repositories/` -> **Data Access:** Enforces DB interaction. Extends `BaseRepository`. Must accept an optional `tx` context for transactions.
- `schemas/` -> **Zod Schemas:** Input validation. Run at the top of Route Handlers.

### 2.2 Frontend (UI) Layers
- `components/ui/` -> Reusable base inputs/components (Tailwind + `cva`).
- **Complex UI:** Dialogs, Dropdowns, Tabs, Selects **MUST** use Radix UI Primitives for A11y.
- **Data Fetching:** Mandated to use **TanStack Query**. No raw `useEffect` fetching.

---

## 3. Backend & API Code Guidelines
1. **Async/Await Only:** No `.then()` or `.catch()`.
2. **Prisma Transactions:** Pass `tx` client down to all repositories inside `$transaction`.
3. **No Database in API Route:** Never import `@prisma/client` inside `/app/api`.
4. **Error Handling:** Throw custom classes (`NotFoundError`, `ConflictError`). Let `handleApiError` shape response.

---

## 4. UI Design System Rules (NDC Tokens)

### 4.1 Visual & Color Tokens
- **Theme Constraints:** **LIGHT MODE ONLY**. Do not write `dark:` utilities.
- **Primary Brand:** `#0F1059` (`bg-[#0F1059]`, `text-[#0F1059]`) used for primary actions, titles, sidebar. Hover: `#161875`.
- **Typography:** Title (`text-2xl font-bold tracking-tight`), Body (`text-base text-slate-600`), Table/Form (`text-sm text-slate-600`), Subtext (`text-xs text-slate-400`).
- **Shapes:** Cards use `rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white`. Inputs/Buttons use `rounded-xl`.

### 4.2 State Mapping (Accessibility Compliant)
Never rely on color alone. Always include text or confirmation markers:
- **Success:** `bg-emerald-50 text-emerald-600 border-emerald-200` (Approved ✓ / Completed ✓)
- **Pending/Warning:** `bg-amber-50 text-amber-600 border-amber-200` (Pending)
- **Danger:** `bg-rose-50 text-rose-600 border-rose-200` (Rejected ✕ / Overdue !)

### 4.3 Responsive & Layout Policy
- **Grid Patterns:** KPI Cards: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6`. Bento: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`.
- **Data Screen Shift:** Viewports `>= lg` render Data Tables (`<th>` headers, aligned columns). Viewports `< lg` **MUST** fallback to Card Lists (`p-4`).
- **Form Containers:** <=2 fields or Destructive Action -> **Modal**. >=5 fields -> **Right-side Half Drawer**. Mobile -> **Bottom Sheet**.

---

## 5. Form & Notification (Toast) Rules
- **Form Validation:** Use React Hook Form + Zod. Inline errors use Rose-colored text directly under the input field. Mark required fields with red `*`.
- **Toast Notifications (Sonner):** Success toast auto-dismisses in 3s. **Error toast must have auto-dismiss DISABLED** to ensure readability.
- **Constraint:** Never use Toast for destructive confirmations (use Modals) or inline validations.

---

## 6. Internationalization (i18n) Policy
- **No Hardcoded Strings:** All UI text must use translation functions (e.g., `t('key')`) pulling from `messages/th.json` and `messages/en.json`.
- **Dynamic Widths:** Components must use natural padding (e.g., `px-4 py-2`) without fixed rigid widths to allow Thai text expansion.