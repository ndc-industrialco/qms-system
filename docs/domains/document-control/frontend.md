# DOCUMENT CONTROL Frontend

---

## Pages

| Path | Component | หน้าที่ |
|------|-----------|--------|
| `/document-control` | `DocumentControlsLevelOneClient` | Department folder grid |
| `/document-control/[dept]` | `DocumentControlListClient` | รายการเอกสารของแผนก |
| `/document-control/[dept]/[id]` | `DocumentControlDetailClient` | รายละเอียดเอกสาร + Revision history |
| `/document-control/categories` | `CategoryListClient` | จัดการ Category |

---

## Components

### DocumentControlsLevelOneClient
- แสดง `DepartmentFolderGrid` — folder icon + ชื่อแผนก
- คลิกเพื่อ navigate ไป `/document-control/[dept]`

### DocumentControlListClient
- รายการเอกสารของแผนก พร้อม filter (search, category, status)
- `CategoryFolderGrid` แสดง category ด้านบน
- `DocumentControlDrawer` สำหรับสร้างเอกสารใหม่

### DocumentControlDetailClient
แสดงรายละเอียดเอกสารครบทุก section:
- Metadata: ชื่อ, รหัส, Revision, สถานะ, วันที่มีผล
- Department + Category
- `DocumentStatusBadge`
- Description
- File info + ปุ่ม Download (`GET /[id]/download-latest`)
- Revision history table (รหัส, วันที่, สถานะ)
- Metadata (ผู้สร้าง, วันที่ create/update)
- Edit: `DocumentControlDetailDrawer`
- Upload: `UploadRevisionDialog`
- Delete: confirmation dialog + redirect

### DocumentControlDrawer
Form สร้าง/แก้ไขเอกสาร:
- Fields: Document Number (disabled in edit), Document Name, Description, Status, Effective Date
- Validation schema แยกระหว่าง create / update
- Submit → `POST /api/document-controls` หรือ `PUT /api/document-controls/[id]`

### UploadRevisionDialog
Dialog อัปโหลด Revision ใหม่:
- File input (filter MIME type)
- Revision Code input
- Effective Date picker
- Status dropdown
- Submit → `POST /api/document-controls/[id]/upload` (FormData)

### CategoryDrawer
Form สร้าง/แก้ไข Category:
- Fields: Name (required), Description, Display Order
- Submit → create หรือ update category

### DocumentStatusBadge
Badge แสดงสถานะ:
| Status | สี |
|--------|---|
| DRAFT | เทา |
| ACTIVE | เขียว |
| OBSOLETE | แดง |

### CategoryFolderGrid / DepartmentFolderGrid
Grid แสดง folder icon + ชื่อ — คลิกเพื่อ navigate

---

## State Management

- ใช้ **TanStack React Query**
- Query keys: `["document-controls"]`, `["document-controls", id]`, `["document-categories"]`
- Invalidate หลัง create / update / delete / upload revision
