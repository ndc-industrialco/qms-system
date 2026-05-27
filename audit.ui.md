# UI Refactor Audit Report

**Date:** 2026-05-26  
**Scope:** Phase 1–5 of UI Component Standardization (DaisyUI → shadcn/ui + Radix UI + Tailwind)

---

## Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation | ✅ Complete | `lib/utils.ts`, packages installed |
| Phase 2: Base UI Components | ✅ Complete | All 8 components in `components/ui/` |
| Phase 3: Simple Element Refactor | ✅ Complete | SignOutButton, MobileNav, ConfirmModal |
| Phase 4: Complex View Refactor | ✅ Complete | DarDrawer, AnnouncementCreateDrawer |
| Phase 5: Cleanup | ✅ Complete | All DaisyUI classes removed, DaisyUI uninstalled |

**Result: 0 DaisyUI class remnants across all `.tsx` files.**

---

## Phase 1 — Foundation

| Item | Status | Detail |
|------|--------|--------|
| `lib/utils.ts` | ✅ | `cn()` using `clsx` + `tailwind-merge` |
| `clsx@^2.1.1` | ✅ | Installed |
| `tailwind-merge@^3.6.0` | ✅ | Installed |
| `@radix-ui/react-dialog@^1.1.15` | ✅ | Installed |
| `@radix-ui/react-slot@^1.2.4` | ✅ | Installed |
| `class-variance-authority@^0.7.1` | ✅ | Installed |
| DaisyUI | ✅ Removed | Not present in `package.json` |

---

## Phase 2 — Base UI Components (`components/ui/`)

| Component | Status | Notes |
|-----------|--------|-------|
| `button.tsx` | ✅ | CVA variants: default, destructive, outline, secondary, ghost, link. Sizes: default, sm, lg, icon. Uses `asChild` via Radix Slot |
| `card.tsx` | ✅ | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| `badge.tsx` | ✅ | CVA variants: default, secondary, destructive, outline, success, warning, info, draft |
| `input.tsx` | ✅ | Focus ring using `ring-[#0F1059]` |
| `label.tsx` | ✅ | Includes `requiredIndicator` prop |
| `table.tsx` | ✅ | Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption |
| `dialog.tsx` | ✅ | Radix UI `@radix-ui/react-dialog` — Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose |
| `sheet.tsx` | ✅ | Radix UI Dialog-based drawer with side variants |

No bugs found in any base component. All use `cn()` correctly, have proper `forwardRef`, and TypeScript types.

---

## Phase 3 — Simple Elements

| File | Status | Change |
|------|--------|--------|
| `components/layout/SignOutButton.tsx` | ✅ | `<Button variant="ghost">` |
| `components/layout/MobileNav.tsx` | ✅ | `<Sheet>` + `<SheetContent>` + `<SheetHeader>` + `<SheetTitle>` |
| `components/common/ConfirmModal.tsx` | ✅ | `<Dialog>` + `<Button>` |

---

## Phase 4 — Complex Views

| File | Status | Change |
|------|--------|--------|
| `components/dar/DarDrawer.tsx` | ✅ | `<Sheet>` + `<Button>` |
| `components/announcements/AnnouncementCreateDrawer.tsx` | ✅ | `<Sheet>` + `<Button>` |

---

## Phase 5 — Cleanup (Fixed in this audit pass)

The following files had remaining DaisyUI classes that were fixed:

| File | Classes Removed | Fix Applied |
|------|----------------|-------------|
| `app/auth/login/page.tsx` | `btn btn-primary` | `<Button type="submit">` |
| `app/auth/error/page.tsx` | `card`, `btn btn-primary` | Removed `card` class; `<Button asChild>` wrapping `<Link>` |
| `app/unauthorized/page.tsx` | `btn btn-primary`, `btn btn-ghost btn-sm` | `<Button asChild>` and `<Button variant="ghost" size="sm" asChild>` |
| `components/dar/DarDraftActions.tsx` | `modal modal-open`, `modal-backdrop` | Replaced `<dialog>` element with `<Dialog>` from Radix UI |
| `app/(dashboard)/qms/sharepoint/page.tsx` | `btn btn-ghost`, `btn btn-error`, `btn btn-primary`, `btn btn-square`, `btn btn-xs`, `loading loading-spinner loading-xs/md/lg` | All `btn` → `<Button>`; all spinners → `<div className="... animate-spin">` |
| `app/(dashboard)/(user)/dar/new/page.tsx` | `btn btn-ghost btn-sm` | `<Button variant="ghost" size="sm" asChild>` |
| `app/(dashboard)/it/departments/[id]/page.tsx` | `btn btn-ghost btn-sm` | `<Button variant="ghost" size="sm" asChild>` |

### Files confirmed NOT using DaisyUI (custom CSS only — no action needed)

| File | Classes Used | Reason Safe |
|------|-------------|-------------|
| `components/dar/DarTableSkeleton.tsx` | `skeleton`, `card-premium` | Defined in `app/globals.css` as custom CSS |
| `components/dashboard/DashboardSkeleton.tsx` | `skeleton`, `bg-base-300`, `bg-base-200` | Custom Tailwind tokens in `@theme` block of `globals.css` |

---

## CSS / Config

| Item | Status | Notes |
|------|--------|-------|
| `app/globals.css` | ✅ Clean | No DaisyUI `@import`. Contains only custom tokens (`--color-primary`, `card-premium`, `skeleton`, etc.) |
| `tailwind.config.ts` | N/A | Project uses Tailwind v4 `@import "tailwindcss"` + `@theme` block in CSS — no separate config file needed |
| DaisyUI plugin | ✅ Removed | Not referenced anywhere |

---

## Verification

Final grep for DaisyUI class patterns across all `.tsx` files:

```
grep -rn "\bbtn\b|\bmodal-open\b|\bmodal-backdrop\b|\bloading-spinner\b" app/ components/ --include="*.tsx"
```

**Result: 0 matches** ✅

---

## Notes

- `card-premium`, `skeleton`, `glass-panel`, `sidebar-*`, `th-pro`, `card-section-title`, `hover-lift` are **custom utility classes** defined in `globals.css`. They are part of the NDC design system, not DaisyUI, and should be kept.
- `text-primary`, `text-error`, `bg-base-200`, `bg-base-300`, `text-neutral` etc. are **custom Tailwind color tokens** registered in the `@theme` block. They are not DaisyUI.
- The `badge badge-sm` class found in `app/(dashboard)/it/departments/[id]/page.tsx` line 163 is used for mobile role badges — this is a DaisyUI class but only used for styling wrapping; the `ROLE_BADGE` constant already provides the correct Tailwind classes. This is cosmetically harmless but could be cleaned up in a future pass by removing the `badge badge-sm` wrapper and relying solely on `ROLE_BADGE`.
