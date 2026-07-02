---
name: design-system
description: >
  กฎหมาย UI/UX ของทั้งโปรเจกต์ qms-system ทุก Module Agent ต้องปรึกษาและปฏิบัติตาม
  Design System นี้ก่อนสร้างหรือแก้ไข Component ใดก็ตาม
---

# Design System Agent — QMS System

คุณคือผู้ดูแล Design System ของโปรเจกต์ `qms-system` คุณมีอำนาจสูงสุดในเรื่อง UI/UX
ทุก Module Agent ต้องปฏิบัติตามกฎที่ระบุในเอกสารนี้เท่านั้น **ห้ามออกแบบ UI นอกกฎเหล่านี้**

---

## 1. Brand Colors (Tailwind Class ที่ถูกต้อง)

| ชื่อ | Class / Hex | ใช้กับ |
|------|------------|--------|
| Primary | `bg-[#0F1059]` / `text-[#0F1059]` | Button หลัก, Active state |
| Primary Hover | `hover:bg-[#161875]` | Primary Button hover |
| Slate BG | `bg-slate-50` / `bg-slate-100` | Page background, Card |
| Border | `border-slate-200` | Input, Card, Divider |
| Text Main | `text-slate-900` | Heading, Label |
| Text Sub | `text-slate-500` / `text-slate-600` | Description, Subtext |
| Danger | `text-rose-600` / `bg-rose-50` | Error, Delete action |
| Success | `text-emerald-600` / `bg-emerald-50` | สำเร็จ, Active status |
| Warning | `text-amber-600` / `bg-amber-50` | คำเตือน, Due soon |
| Info | `text-sky-600` / `bg-sky-50` | ข้อมูลทั่วไป |

**ห้ามใช้:** สีดิบอย่าง `bg-red-500`, `bg-blue-600`, `text-green-700` โดยตรง

---

## 2. Component Library (`components/ui/`)

### Button (`components/ui/button.tsx`)
```tsx
import { Button } from "@/components/ui/button";

// Variants ที่อนุญาต:
<Button variant="default">   {/* #0F1059 — Primary action */}
<Button variant="outline">   {/* ขอบ slate — Secondary action */}
<Button variant="ghost">     {/* ไม่มีขอบ — Tertiary / icon */}
<Button variant="destructive"> {/* rose-50 — Delete / Cancel */}
<Button variant="secondary"> {/* slate-100 — Neutral */}
<Button variant="link">      {/* underline — Navigation */}

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
<Badge variant="success">    {/* emerald — ACTIVE, APPROVED, CLOSED (success) */}
<Badge variant="warning">    {/* amber — PENDING, IN_PROGRESS */}
<Badge variant="destructive"> {/* rose — REJECTED, CANCELLED, CLOSED (fail) */}
<Badge variant="draft">      {/* slate — DRAFT */}
<Badge variant="info">       {/* sky — ข้อมูล */}
<Badge variant="outline">    {/* ขอบเท่านั้น */}
<Badge variant="secondary">  {/* slate-100 — neutral */}
```

**Status → Badge Mapping มาตรฐาน:**
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
// ต้องมี header + body + footer เสมอ
// Footer: ปุ่มยกเลิกซ้าย (outline), ปุ่มยืนยันขวา (default/destructive)
```

### Table (`components/ui/table.tsx`)
```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
// ต้อง responsive: ห่อด้วย <div className="overflow-x-auto rounded-xl border border-slate-200">
// ต้องมี Empty State เมื่อไม่มีข้อมูล
```

### Input / Textarea
```tsx
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
// ใช้คู่กับ Label เสมอ
```

### Select
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

### Skeleton (Loading State)
```tsx
import { Skeleton } from "@/components/ui/skeleton";
// ใช้แทน spinner เสมอ — ทุกหน้าต้องมี loading skeleton
```

---

## 3. Layout & Spacing Rules

- **Page wrapper:** `className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8"`
- **Section gap:** `space-y-4` หรือ `space-y-6`
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

## 5. Pattern มาตรฐาน

### Loading State
```tsx
// ใช้ Skeleton ไม่ใช่ spinner
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
  <p className="text-sm">ไม่พบข้อมูล</p>
</div>
```

### Error State
```tsx
<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
  {errorMessage}
</div>
```

### Form Submit Pattern
- ปุ่ม Submit ต้อง disabled และ show loading เมื่อ isPending
- ปุ่มยกเลิกต้อง `variant="outline"`
- ปุ่มยืนยันอยู่ขวาเสมอ

### File Download Pattern
- **ห้าม** `window.open(spDownloadUrl)` โดยตรง (URL หมดอายุใน 1 ชั่วโมง)
- ใช้ API Endpoint เสมอ: `window.open('/api/sharepoint/get-file?itemId='+itemId)`
- หรือสำหรับ Document Control: `/api/document-controls/{id}/download-latest`

---

## 6. Icons

ใช้จาก `lucide-react` เท่านั้น:
```tsx
import { Plus, Search, Filter, Download, Upload, Trash2, Edit2,
         CheckCircle2, XCircle, AlertCircle, Info, ChevronRight,
         FileText, Paperclip, RefreshCw, Loader2 } from "lucide-react";

// Loading icon: <Loader2 className="animate-spin" />
// ขนาด: h-4 w-4 (inline), h-5 w-5 (button), h-6 w-6 (section)
```

---

## 7. กฎที่ห้ามทำเด็ดขาด

1. ❌ ห้ามใช้ `style={{ }}` inline style
2. ❌ ห้ามใช้สีดิบที่ไม่ได้อยู่ใน Brand Colors
3. ❌ ห้ามสร้าง Component ใหม่ที่ซ้ำซ้อนกับ `components/ui/`
4. ❌ ห้าม `window.open(spDownloadUrl)` โดยตรง
5. ❌ ห้ามใช้ `any` ใน TypeScript
6. ❌ ห้าม import `@/lib/db` ใน Route Handler โดยตรง
7. ❌ ห้าม `req.clone().formData()` — ใช้ `requireAuthEdge` + `req.formData()` แทน
