---
name: agent-document-control
description: >
  ผู้เชี่ยวชาญ Module Document Control รู้ Status Flow, Revision Management,
  Download Logic (Fresh URL), Category/Department Tree, และ SharePoint integration
---

# Agent-DocumentControl — Document Control Module

คุณคือผู้เชี่ยวชาญ Module Document Control ของโปรเจกต์ `qms-system`
**ด้าน UI/UX ต้องปฏิบัติตาม Design System Agent เสมอ**

---

## 1. Business Logic — Status Flow

```
DRAFT → ACTIVE → OBSOLETE
```

| Status | ความหมาย |
|--------|----------|
| DRAFT | กำลังร่าง ยังไม่ใช้งาน |
| ACTIVE | ใช้งานอยู่ (Revision ล่าสุดจะเป็น ACTIVE) |
| OBSOLETE | เวอร์ชันเก่า ไม่ใช้แล้ว |

**กฎ Revision:** เมื่อ upload revision ใหม่:
- Revision ใหม่ → ACTIVE
- Revision เก่าทั้งหมด → OBSOLETE
- มี ACTIVE revision ได้แค่ 1 ตัวเสมอ

---

## 2. Permission Matrix

| Action | USER | QMS | MR | IT |
|--------|------|-----|----|----|
| ดูรายการ | ✅ | ✅ | ✅ | ✅ |
| สร้าง Document | ❌ | ✅ | ✅ | ✅ |
| Upload Revision | ❌ | ✅ | ✅ | ✅ |
| ลบ Document | ❌ | ✅ | ❌ | ✅ |
| จัดการ Category | ❌ | ✅ | ❌ | ✅ |

---

## 3. Structure — Department → Category → Document

```
DocControlDept (แผนก)
  └── DocumentCategory (หมวดหมู่)
        └── DocumentControl (เอกสาร)
              └── DocumentControlRevision (เวอร์ชัน)
```

---

## 4. ⚠️ Download Rule — สำคัญมาก

**ห้าม** ใช้ `spDownloadUrl` จากฐานข้อมูลโดยตรง เพราะหมดอายุใน 1 ชั่วโมง

```typescript
// ✅ ถูกต้อง — ใช้ API เพื่อรับ Fresh URL
window.open(`/api/document-controls/${doc.id}/download-latest`, '_blank');

// ✅ สำหรับ Revision ที่มี spItemId:
const res = await fetch(`/api/sharepoint/get-file?itemId=${spItemId}`);
const { data } = await res.json();
window.open(data.downloadUrl, '_blank');

// ❌ ห้าม:
window.open(doc.spDownloadUrl!, '_blank');
```

---

## 5. Files ที่รับผิดชอบ

### Backend
- `services/documentControlService.ts` — Business Logic หลัก
- `services/documentCategoryService.ts` — จัดการ Category
- `services/docControlDeptService.ts` — จัดการ Department
- `repositories/documentControlRepository.ts` — DB queries
- `repositories/documentCategoryRepository.ts`

### API Routes
- `app/api/document-controls/` — CRUD
- `app/api/document-controls/[id]/upload/` — Upload revision
- `app/api/document-controls/[id]/download-latest/` — Download fresh URL
- `app/api/document-controls/[id]/revisions/` — รายการ Revision

### Frontend Components
- `components/document-control/` — Components ทั้งหมด
- `app/(dashboard)/qms/document-controls/` — Pages

---

## 6. Schema ที่เกี่ยวข้อง

```prisma
model DocumentControl          // เอกสารหลัก
model DocumentControlRevision  // เวอร์ชันของเอกสาร (spItemId สำคัญ)
model DocumentCategory         // หมวดหมู่ (อยู่ใต้ DocControlDept)
model DocControlDept           // แผนกของ Document Control

enum DocControlStatus { DRAFT ACTIVE OBSOLETE }
```

---

## 7. กฎสำคัญของ Module นี้

1. `spItemId` ใน `DocumentControlRevision` คือ key สำหรับขอ Fresh URL
2. `download-latest` route ต้องเรียก `getFileInfo(spItemId)` ก่อน redirect เสมอ
3. DocNumber ต้องไม่ซ้ำกันในระบบ
4. Folder path format: `{DeptName}/{CategoryName}/{DocNumber}/`
5. File types ที่รับ: PDF, DOCX, XLSX, PNG, JPG (max 20MB)
