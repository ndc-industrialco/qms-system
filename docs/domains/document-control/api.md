# DOCUMENT CONTROL API

Base path: `/api/document-controls`

---

## Endpoints

### GET /api/document-controls
ดึงรายการเอกสารแบบ paginated + filter

- **Auth:** Login required
- **Query params:**

| Param | Type | หมายเหตุ |
|-------|------|---------|
| `search` | string | ค้นหาจากชื่อ/รหัสเอกสาร |
| `categoryId` | string | กรองตาม category |
| `status` | string | DRAFT / ACTIVE / OBSOLETE |
| `sort` | string | field ที่ sort |
| `page` / `limit` | number | pagination |

- **Response:** Paginated array of documents

---

### POST /api/document-controls
สร้างเอกสารใหม่

- **Auth:** QMS / IT / MR
- **Body:** JSON

```json
{
  "docNumber": "QMS-001",
  "docName": "ขั้นตอนการควบคุมเอกสาร",
  "revision": "A",
  "description": "...",
  "status": "DRAFT",
  "effectiveDate": "2026-06-01",
  "departmentId": "uuid",
  "categoryId": "uuid"
}
```

- **Response 201:** `{ "id": "uuid" }`
- **Side-effect:** สร้าง Folder ใน SharePoint

---

### GET /api/document-controls/[id]
ดูรายละเอียดเอกสาร

- **Auth:** Login required
- **Response:** Document พร้อม revisions[], department, category

---

### PUT /api/document-controls/[id]
แก้ไข metadata เอกสาร

- **Auth:** QMS / IT / MR
- **Body:** JSON (title, description, status, categoryId, departmentId)
- **Side-effect:** ถ้า docName เปลี่ยน → rename ไฟล์ใน SharePoint

---

### DELETE /api/document-controls/[id]
ลบเอกสาร

- **Auth:** QMS / IT / MR
- **Side-effect:** ลบ Folder ใน SharePoint + บันทึก AuditLog

---

### POST /api/document-controls/[id]/upload
อัปโหลด Revision ใหม่

- **Auth:** QMS / IT / MR
- **Body:** `multipart/form-data`

| Field | Required | หมายเหตุ |
|-------|----------|---------|
| `file` | ✅ | ไฟล์เอกสาร |
| `revisionCode` | ✅ | รหัส Revision เช่น A, 1.0 |
| `effectiveDate` | ✅ | วันที่มีผล |
| `status` | ✅ | DRAFT / ACTIVE / OBSOLETE |

- **Validation:** ตรวจ file size, MIME type, magic bytes
- **Side-effect:** อัปโหลดไฟล์ขึ้น SharePoint + สร้าง Revision record ใน DB (transaction)

---

### GET /api/document-controls/[id]/download-latest
ดาวน์โหลด Revision ล่าสุด

- **Auth:** Login required
- **Response:** Redirect ไปที่ SharePoint download URL
- **Logic:** หา Revision ที่ status=ACTIVE ล่าสุด (fallback: Revision แรก)
- **Error:** 404 ถ้าไม่มี Revision
