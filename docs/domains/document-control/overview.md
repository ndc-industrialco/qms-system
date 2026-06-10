# DOCUMENT CONTROL Domain Overview

**Purpose:** จัดการเอกสารควบคุมขององค์กร — อัปโหลด, Revision, Category, Department folder, และ Approval workflow  
**Status:** PARTIAL (Approval Workflow + Email Notification ยังไม่ implement)

---

## Roles & Permissions

| Role | สิทธิ์ |
|------|--------|
| QMS / IT / MR | สร้าง / แก้ไข / ลบ / อัปโหลด Revision เอกสารทั้งหมด |
| USER | ดู + ดาวน์โหลดเอกสาร (ตามแผนก) |

---

## Document Status Flow

```
DRAFT
  └─> ACTIVE      (เอกสารใช้งานได้)
        └─> OBSOLETE  (เลิกใช้งาน)
```

---

## Data Model

### DocumentControl (เอกสารหลัก)

| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | UUID | PK |
| `docNumber` | String | unique — รหัสเอกสาร |
| `docName` | String | ชื่อเอกสาร |
| `revision` | String | เวอร์ชันปัจจุบัน |
| `description` | String | รายละเอียด |
| `status` | Enum | DRAFT / ACTIVE / OBSOLETE |
| `effectiveDate` | DateTime | วันที่มีผลบังคับใช้ |
| `spDriveId` / `spItemId` | String? | SharePoint Drive/Item |
| `spWebUrl` / `spDownloadUrl` | String? | SharePoint URLs |
| `spFolderPath` | String? | path โฟลเดอร์ใน SharePoint |
| `fileName` / `fileSize` / `mimeType` | String? | ไฟล์ปัจจุบัน |
| `departmentId` | String | FK → Department |
| `categoryId` | String? | FK → DocumentCategory |
| `createdById` / `updatedById` | String | FK → User |

### DocumentCategory (หมวดหมู่)

| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | UUID | PK |
| `name` | String | ชื่อ Category |
| `description` | String? | รายละเอียด |
| `order` | Int | ลำดับแสดง |
| `departmentId` | String | FK → Department |
| Unique | | `(departmentId, name)` |

### DocumentControlRevision (ประวัติ Revision)

| Field | Type | หมายเหตุ |
|-------|------|---------|
| `id` | UUID | PK |
| `documentId` | String | FK → DocumentControl |
| `revisionCode` | String | รหัส Revision เช่น A, B, 1.0 |
| `effectiveDate` | DateTime | |
| `status` | Enum | DRAFT / ACTIVE / OBSOLETE |
| SharePoint fields | String? | เหมือน DocumentControl |

---

## SharePoint Integration

- เอกสารทุกรายการเก็บใน **SharePoint** โดย:
  - สร้าง Folder ตาม Department → Category → Document
  - Folder ย้ายตามการเปลี่ยน Category/Department
  - Compensation pattern: ถ้า DB fail หลัง SP upload → rollback file

---

## Pending Features

- [ ] Multi-Level Approval Workflow (Preparer → Reviewer → Approver)
- [ ] Email Notification เมื่อสถานะเอกสารเปลี่ยน

---

For detailed specs, see:
- [api.md](./api.md)
- [frontend.md](./frontend.md)
- [database.md](./database.md)
- [task-log.md](./task-log.md)
