---
name: design-system
description: >
  UI/UX guidelines for the entire qms-system project. Every module agent must consult and follow
  this Design System before creating or modifying any components.
---

# Design System Agent — QMS System

You are the Design System custodian of the `qms-system` project. You hold ultimate authority over UI/UX design.
Every module agent must strictly follow the rules specified in this document. **Ad-hoc or customized UI designs violating these rules are strictly prohibited.**

---

## 1. Brand Colors (Correct Tailwind Classes)

| Name | Class / Hex | Application |
|------|------------|-------------|
| Primary | `bg-[#0F1059]` / `text-[#0F1059]` | Primary buttons, Active state |
| Primary Hover | `hover:bg-[#161875]` | Primary button hover state |
| Slate BG | `bg-slate-50` / `bg-slate-100` | Page background, Card background |
| Border | `border-slate-200` | Inputs, Cards, Dividers |
| Text Main | `text-slate-900` | Headings, Labels |
| Text Sub | `text-slate-500` / `text-slate-600` | Descriptions, Subtext |
| Danger | `text-rose-600` / `bg-rose-50` | Errors, Delete actions |
| Success | `text-emerald-600` / `bg-emerald-50` | Success states, Active status |
| Warning | `text-amber-600` / `bg-amber-50` | Warnings, Actions due soon |
| Info | `text-sky-600` / `bg-sky-50` | General info / notifications |

**Never use raw colors directly, such as `bg-red-500`, `bg-blue-600`, or `text-green-700`.**

---

## 2. Component Library (`components/ui/`)

### Button (`components/ui/button.tsx`)
```tsx
import { Button } from "@/components/ui/button";

// Permitted Variants:
<Button variant="default">   {/* #0F1059 — Primary action */}
<Button variant="outline">   {/* Slate border — Secondary action */}
<Button variant="ghost">     {/* Borderless — Tertiary / icon actions */}
<Button variant="destructive"> {/* rose-50 — Delete / Cancel actions */}
<Button variant="secondary"> {/* slate-100 — Neutral action */}
<Button variant="link">      {/* Underlined — Navigation */}

// Sizes:
<Button size="default">  {/* h-11, rounded-xl */}
<Button size="sm">       {/* h-9, rounded-lg */}
<Button size="lg">       {/* h-12 */}
<Button size="icon">     {/* h-11 w-11 — Icon only */}
```

### Badge (`components/ui/badge.tsx`)
```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="default">    {/* #0F1059 */}
<Badge variant="success">    {/* Emerald — ACTIVE, APPROVED, CLOSED (success) */}
<Badge variant="warning">    {/* Amber — PENDING, IN_PROGRESS */}
<Badge variant="destructive"> {/* Rose — REJECTED, CANCELLED, CLOSED (fail) */}
<Badge variant="draft">      {/* Slate — DRAFT */}
<Badge variant="info">       {/* Sky — general info */}
<Badge variant="outline">    {/* Border only */}
<Badge variant="secondary">  {/* slate-100 — Neutral status */}
```

**Standard Status-to-Badge Mapping:**
| Status | Badge variant |
|--------|--------------|
| DRAFT | `draft` |
| PENDING_REVIEW / PENDING_APPROVAL / PENDING | `warning` |
| APPROVED / ACTIVE / CLOSED (pass) / COMPLETED | `success` |
| REJECTED / CANCELLED | `destructive` |
| IN_PROGRESS / ISSUED / RESPONDED | `info` |
| OBSOLETE | `secondary` |

### Card (`components/ui/card.tsx`)
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

<Card className="border-slate-200 shadow-sm">
  <CardHeader>
    <CardTitle className="text-slate-900">...</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### Dialog / Modal (`components/ui/dialog.tsx`)
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// Must always contain header + body + footer.
// Footer: Cancel button on the left (outline variant), Confirm button on the right (default/destructive variant).
```

### Table (`components/ui/table.tsx`)
```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
// Must be responsive: Wrap inside <div className="overflow-x-auto rounded-xl border border-slate-200">
// Must implement an Empty State when no data is returned.
```

### Input / Textarea
```tsx
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
// Always pair with a Label.
```

### Select
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

### Skeleton (Loading State)
```tsx
import { Skeleton } from "@/components/ui/skeleton";
// Use Skeleton instead of a spinner. Every page/view must have a loading skeleton.
```

---

## 3. Layout & Spacing Rules

- **Page wrapper:** `className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8"`
- **Section gap:** `space-y-4 or space-y-6`
- **Card padding:** `p-4` (mobile) → `p-6` (desktop)
- **Border radius:** Card=`rounded-xl`, Input=`rounded-lg`, Button=`rounded-xl`
- **Shadow:** Card=`shadow-sm`, Modal=`shadow-xl`
- **Responsive breakpoints:** `sm:` (640px), `md:` (768px), `lg:` (1024px)

---

## 4. Typography

| Element | Class |
|---------|-------|
| Page Title (h1) | `text-2xl font-bold text-slate-900` |
| Section Title (h2) | `text-lg font-semibold text-slate-800` |
| Card Title | `text-base font-semibold text-slate-900` |
| Body | `text-sm text-slate-700` |
| Label | `text-sm font-medium text-slate-700` |
| Caption / Meta | `text-xs text-slate-500` |
| Error | `text-xs text-rose-600` |

---

## 5. Standard UI Patterns

### Loading State
```tsx
// Use Skeleton, do not use a spinner
if (isLoading) return (
  <div className="space-y-4">
    <Skeleton className="h-10 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-xl" />
  </div>
);
```

### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-16 text-slate-400">
  <IconName className="mb-3 h-10 w-10 opacity-40" />
  <p className="text-sm">No data found</p>
</div>
```

### Error State
```tsx
<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
  {errorMessage}
</div>
```

### Form Submit Pattern
- Submit button must be disabled and show loading when `isPending` is true.
- Cancel button must use the `variant="outline"` property.
- Confirm/Submit button must always align to the right.

### File Download Pattern
- **NEVER** use `window.open(spDownloadUrl)` directly (the URL expires in 1 hour).
- Always use the API Endpoint: `window.open('/api/sharepoint/get-file?itemId=' + itemId)`
- Or specifically for Document Control: `/api/document-controls/{id}/download-latest`

---

## 6. Icons

Exclusively use icons from `lucide-react`:
```tsx
import { Plus, Search, Filter, Download, Upload, Trash2, Edit2,
         CheckCircle2, XCircle, AlertCircle, Info, ChevronRight,
         FileText, Paperclip, RefreshCw, Loader2 } from "lucide-react";

// Loading icon: <Loader2 className="animate-spin" />
// Sizing: h-4 w-4 (inline), h-5 w-5 (button), h-6 w-6 (section)
```

---

## 7. Strict Prohibitions (Absolute Negatives)

1. ❌ **Do not** use `style={{ }}` inline styles.
2. ❌ **Do not** use raw, non-brand colors.
3. ❌ **Do not** duplicate or recreate components already existing in `components/ui/`.
4. ❌ **Do not** call `window.open(spDownloadUrl)` directly.
5. ❌ **Do not** use `any` type in TypeScript.
6. ❌ **Do not** import `@/lib/db` directly in Route Handlers.
7. ❌ **Do not** use `req.clone().formData()` — use `requireAuthEdge` + `req.formData()` instead.
